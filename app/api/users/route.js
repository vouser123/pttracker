// app/api/users/route.js — GET users (role-filtered), PATCH own notification preferences.

import { getSupabaseAdmin } from '../../../lib/db.js';
import { authenticateRoute, unauthorized, methodNotAllowed, serverError } from '../../../lib/route-auth.js';

/**
 * GET /api/users — Returns users based on role:
 *   - Patients: see only themselves
 *   - Therapists: see themselves and their assigned patients
 *   - Admins: see all users
 */
export async function GET(request) {
    const { user, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const supabaseAdmin = getSupabaseAdmin();

    try {
        const { data: allUsers, error: dbError } = await supabaseAdmin
            .from('users')
            .select('id, auth_id, email, role, therapist_id, first_name, last_name, created_at, email_notifications_enabled')
            .order('email');

        if (dbError) throw dbError;

        let users = [];
        if (user.role === 'admin') {
            users = allUsers;
        } else if (user.role === 'therapist') {
            users = allUsers.filter(u => u.id === user.id || u.therapist_id === user.id);
        } else {
            users = allUsers.filter(u => u.id === user.id);
        }

        return Response.json({ users });

    } catch (err) {
        console.error('Error fetching users:', err);
        return serverError('Failed to fetch users', err);
    }
}

/**
 * PATCH /api/users — Update own notification preferences.
 * Only accepts: { email_notifications_enabled: boolean }
 * Always scoped to the authenticated user's record.
 */
export async function PATCH(request) {
    const { user, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email_notifications_enabled } = body;

    if (typeof email_notifications_enabled !== 'boolean') {
        return Response.json(
            { error: 'Invalid value for email_notifications_enabled — must be boolean' },
            { status: 400 }
        );
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .update({ email_notifications_enabled })
            .eq('id', user.id);

        if (dbError) throw dbError;

        return Response.json({ updated: true });

    } catch (err) {
        console.error('Error updating user preferences:', err);
        return serverError('Failed to update preferences', err);
    }
}
