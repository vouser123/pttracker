// app/api/notify/route.js — Daily email digest (Vercel Cron). Auth via CRON_SECRET, not JWT.

import { getSupabaseAdmin } from '../../../lib/db.js';

/**
 * GET /api/notify — Send daily unread-message digest emails via Resend.
 *
 * Called by Vercel Cron once daily. Secured by CRON_SECRET Bearer token.
 * Required env vars: CRON_SECRET, RESEND_API_KEY, EMAIL_FROM, APP_URL
 *
 * Guards:
 * - Skips users with email_notifications_enabled = false
 * - Skips users notified within the last 23 hours
 * - Skips users with no messages newer than their last_notified_at
 */
export async function GET(request) {
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
