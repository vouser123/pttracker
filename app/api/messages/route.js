// app/api/messages/route.js — Clinical messages: GET, POST, PATCH, DELETE.

import { getSupabaseAdmin, getSupabaseWithAuth } from '../../../lib/db.js';
import { authenticateRoute, unauthorized, forbidden, badRequest, serverError } from '../../../lib/route-auth.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/messages — Returns all non-deleted clinical messages where user is sender or recipient.
 * Normalizes is_archived per viewer.
 */
export async function GET(request) {
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
