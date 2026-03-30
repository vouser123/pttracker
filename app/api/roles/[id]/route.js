// app/api/roles/[id]/route.js — DELETE (soft-delete) a role assignment.

import { getSupabaseWithAuth } from '../../../../lib/db.js';
import { authenticateRoute, unauthorized, forbidden, serverError } from '../../../../lib/route-auth.js';

/**
 * DELETE /api/roles/:id — Soft-delete a role assignment (sets active=false).
 * Only therapists and admins can delete.
 */
export async function DELETE(request, { params }) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    if (user.role !== 'therapist' && user.role !== 'admin') {
        return forbidden('Only therapists and admins can delete role assignments');
    }

    const { id: roleId } = await params;
    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data, error: dbError } = await supabase
            .from('exercise_roles')
            .update({ active: false, updated_at: new Date().toISOString() })
            .eq('id', roleId)
            .select()
            .single();

        if (dbError) throw dbError;

        return Response.json({ success: true, deleted: roleId });

    } catch (err) {
        console.error('Error deleting role:', err);
        return serverError('Failed to delete role', err);
    }
}
