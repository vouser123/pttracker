// app/api/messages/route.js — Clinical messages (GET, POST, PATCH, DELETE) + cron notify (GET ?type=notify).

import { getSupabaseAdmin, getSupabaseWithAuth } from '../../../lib/db.js';
import { authenticateRoute, unauthorized, forbidden, badRequest, serverError } from '../../../lib/route-auth.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// DAILY EMAIL NOTIFICATION (Vercel Cron) — GET /api/messages?type=notify
// Secured by CRON_SECRET (Bearer token), not JWT.
// Required env vars: CRON_SECRET, RESEND_API_KEY, EMAIL_FROM, APP_URL
// ============================================================================

async function handleNotify(request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    try {
        const { data: unread, error: msgError } = await supabase
            .from('clinical_messages')
            .select('id, recipient_id, sender_id, body, created_at')
            .eq('read_by_recipient', false)
            .eq('archived_by_recipient', false)
            .is('deleted_at', null);

        if (msgError) throw msgError;
        if (!unread || unread.length === 0) {
            return Response.json({ sent: 0, skipped: 0 });
        }

        const byRecipient = {};
        for (const msg of unread) {
            if (!byRecipient[msg.recipient_id]) byRecipient[msg.recipient_id] = [];
            byRecipient[msg.recipient_id].push(msg);
        }

        const recipientIds = Object.keys(byRecipient);

        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, email, first_name, role, last_notified_at, email_notifications_enabled')
            .in('id', recipientIds);

        if (userError) throw userError;

        const userMap = {};
        for (const u of (users || [])) userMap[u.id] = u;

        const senderIds = [...new Set(unread.map(m => m.sender_id))];
        const { data: senders } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', senderIds);

        const senderMap = {};
        for (const s of (senders || [])) {
            senderMap[s.id] = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Your care team';
        }

        const appUrl = process.env.APP_URL || 'https://pttracker.app';
        const from = process.env.EMAIL_FROM || 'notifications@pttracker.app';
        const resendApiKey = process.env.RESEND_API_KEY;

        let sent = 0;
        let skipped = 0;

        for (const [recipientId, messages] of Object.entries(byRecipient)) {
            const user = userMap[recipientId];

            if (!user?.email) { skipped++; continue; }
            if (user.email_notifications_enabled === false) { skipped++; continue; }

            if (user.last_notified_at) {
                const hoursSince = (Date.now() - new Date(user.last_notified_at).getTime()) / (1000 * 60 * 60);
                if (hoursSince < 23) { skipped++; continue; }
            }

            const newMessages = user.last_notified_at
                ? messages.filter(m => new Date(m.created_at) > new Date(user.last_notified_at))
                : messages;

            if (newMessages.length === 0) { skipped++; continue; }

            const senderNames = [...new Set(newMessages.map(m => senderMap[m.sender_id] || 'Your care team'))];
            const name = escapeHtml(user.first_name || 'there');
            const deepLink = user.role === 'therapist' ? `${appUrl}/pt` : `${appUrl}/track`;

            const messageCards = newMessages.map(m => {
                const senderName = escapeHtml(senderMap[m.sender_id] || 'Your care team');
                const msgBody = escapeHtml(m.body || '');
                const date = new Date(m.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                });
                return `<div style="border-left:3px solid #6c63ff; padding:8px 16px; margin:12px 0; background:#f9f9f9;">
  <p style="margin:0; font-size:12px; color:#666;">${senderName} · ${date}</p>
  <p style="margin:8px 0 0;">${msgBody}</p>
</div>`;
            }).join('\n');

            const subject = newMessages.length === 1
                ? `Message from: ${senderNames[0]}`
                : `Messages from: ${senderNames.join(', ')}`;

            const emailHtml = `<p>Hi ${name},</p>
<p>Messages from: ${senderNames.map(escapeHtml).join(', ')}</p>

${messageCards}

<p>
  <a href="${deepLink}"
     style="display:inline-block; background:#6c63ff; color:#fff;
            padding:12px 24px; border-radius:6px; text-decoration:none; margin-top:16px;">
    Log In to Reply
  </a>
</p>

<p style="font-size:12px; color:#999; margin-top:32px;">
  You're receiving this because you have unread messages in PT Tracker.<br>
  To stop receiving these emails, open the messages panel in the app and uncheck "Notify me by email when I receive messages".
</p>`;

            const resp = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: `PT Tracker <${from}>`,
                    to: [user.email],
                    subject,
                    html: emailHtml,
                }),
            });

            if (resp.ok) {
                sent++;
                await supabase
                    .from('users')
                    .update({ last_notified_at: new Date().toISOString() })
                    .eq('id', recipientId);
            } else {
                const errBody = await resp.text();
                console.error(`Resend error for ${recipientId}:`, resp.status, errBody);
                skipped++;
            }
        }

        return Response.json({ sent, skipped, total: recipientIds.length });

    } catch (err) {
        console.error('Error sending notifications:', err);
        return Response.json({
            error: 'Notification failed',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        }, { status: 500 });
    }
}

// ============================================================================
// MESSAGES CRUD
// ============================================================================

/**
 * GET /api/messages — Returns all non-deleted clinical messages for the current user.
 * GET /api/messages?type=notify — Cron: send daily unread-message digest emails (CRON_SECRET auth).
 */
export async function GET(request) {
    if (request.nextUrl.searchParams.get('type') === 'notify') {
        return handleNotify(request);
    }

    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data: messages, error: dbError } = await supabase
            .from('clinical_messages')
            .select('*')
            .is('deleted_at', null)
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .order('created_at', { ascending: true });

        if (dbError) throw dbError;

        const normalizedMessages = (messages || []).map(message => {
            const isSender = message.sender_id === user.id;
            const is_archived = isSender ? message.archived_by_sender : message.archived_by_recipient;
            return { ...message, is_archived: Boolean(is_archived) };
        });

        return Response.json({ messages: normalizedMessages, count: normalizedMessages.length });

    } catch (err) {
        console.error('Error fetching messages:', err);
        return serverError('Failed to fetch messages', err);
    }
}

/**
 * POST /api/messages — Create a new clinical message.
 * Body: { recipient_id, body, subject? }
 *
 * Relationship rules:
 * - Patients may only message their assigned therapist.
 * - Therapists may only message their assigned patients.
 */
export async function POST(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    let body;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const { recipient_id, subject, body: messageBody } = body;

    const hasValidRecipientId = typeof recipient_id === 'string' && recipient_id.trim().length > 0;
    const hasValidBody = typeof messageBody === 'string' && messageBody.trim().length > 0;

    if (!hasValidRecipientId || !hasValidBody) {
        return badRequest('Missing required fields: recipient_id, body');
    }

    if (!UUID_RE.test(recipient_id)) {
        return badRequest('Invalid recipient_id format');
    }

    if (recipient_id === user.id) {
        return badRequest('recipient_id cannot match sender_id');
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
        const [{ data: sender, error: senderError }, { data: recipient, error: recipientError }] = await Promise.all([
            supabaseAdmin.from('users').select('id, role, therapist_id').eq('id', user.id).single(),
            supabaseAdmin.from('users').select('id, role, therapist_id').eq('id', recipient_id).single(),
        ]);

        if (senderError || !sender) {
            return Response.json({ error: 'Sender profile not found' }, { status: 403 });
        }

        if (recipientError || !recipient) {
            return Response.json({ error: 'Recipient not found' }, { status: 404 });
        }

        if (sender.role === 'patient') {
            if (!sender.therapist_id || recipient.id !== sender.therapist_id) {
                return forbidden('Patient recipient must be assigned therapist');
            }
        } else if (sender.role === 'therapist') {
            if (recipient.therapist_id !== sender.id) {
                return forbidden('Recipient is not assigned to this therapist');
            }
        }

        const patientId = user.role === 'patient' ? user.id : recipient_id;
        const supabase = getSupabaseWithAuth(accessToken);

        const { data: message, error: dbError } = await supabase
            .from('clinical_messages')
            .insert({
                patient_id: patientId,
                sender_id: user.id,
                recipient_id,
                subject: subject || null,
                body: messageBody,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return Response.json({ message }, { status: 201 });

    } catch (err) {
        console.error('Error creating message:', err);
        return serverError('Failed to create message', err);
    }
}

/**
 * PATCH /api/messages?id=X — Mark message as read or archived.
 * Body: { read?: boolean, archived?: boolean }
 */
export async function PATCH(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return badRequest('Missing message id');
    if (!UUID_RE.test(id)) return badRequest('Invalid message id format');

    let body;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const { read, archived } = body;
    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data: existing, error: fetchError } = await supabase
            .from('clinical_messages')
            .select('sender_id, recipient_id, read_at')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) return Response.json({ error: 'Message not found' }, { status: 404 });

        const isSender = existing.sender_id === user.id;
        const isRecipient = existing.recipient_id === user.id;

        if (!isSender && !isRecipient) {
            return forbidden('Not authorized to update this message');
        }

        const updates = { updated_at: new Date().toISOString() };

        if (read !== undefined && isRecipient) {
            updates.read_by_recipient = read;
            if (read && !existing.read_at) {
                updates.read_at = new Date().toISOString();
            }
        }

        if (archived !== undefined) {
            if (isSender) {
                updates.archived_by_sender = archived;
            } else if (isRecipient) {
                updates.archived_by_recipient = archived;
            }
        }

        const { data: message, error: dbError } = await supabase
            .from('clinical_messages')
            .update(updates)
            .eq('id', id)
            .select()
            .maybeSingle();

        if (dbError) throw dbError;
        if (!message) return Response.json({ error: 'Message not found or update not permitted' }, { status: 404 });

        return Response.json({ message });

    } catch (err) {
        console.error('Error updating message:', err);
        return serverError('Failed to update message', err);
    }
}

/**
 * DELETE /api/messages?id=X — Soft-delete message.
 * Only sender can delete, only within 1-hour window.
 */
export async function DELETE(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return badRequest('Missing message id');
    if (!UUID_RE.test(id)) return badRequest('Invalid message id format');

    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data: existing, error: fetchError } = await supabase
            .from('clinical_messages')
            .select('sender_id, created_at')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) return Response.json({ error: 'Message not found' }, { status: 404 });

        if (existing.sender_id !== user.id) {
            return forbidden('Only the sender can delete a message');
        }

        const createdAt = new Date(existing.created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        if (createdAt < oneHourAgo) {
            return forbidden('Cannot delete message after 1 hour');
        }

        const { data: message, error: dbError } = await supabase
            .from('clinical_messages')
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: user.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (dbError) throw dbError;
        if (!message) return Response.json({ error: 'Message not found or delete not permitted' }, { status: 404 });

        return Response.json({ message, deleted: true });

    } catch (err) {
        console.error('Error deleting message:', err);
        return serverError('Failed to delete message', err);
    }
}
