// app/api/roles/route.js — GET exercise roles, POST new role assignment.

import { getSupabaseWithAuth } from '../../../lib/db.js';
import { authenticateRoute, unauthorized, forbidden, badRequest, serverError } from '../../../lib/route-auth.js';

/**
 * GET /api/roles
 * GET /api/roles?exercise_id=X — filter to specific exercise
 *
 * Returns exercise roles (region × capacity × focus × contribution).
 * Excludes non-routine exercises and inactive roles.
 */
export async function GET(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const supabase = getSupabaseWithAuth(accessToken);
    const exercise_id = request.nextUrl.searchParams.get('exercise_id');

    try {
        let query = supabase
            .from('exercise_roles')
            .select(`
                *,
                exercises!inner (
                    id,
                    canonical_name,
                    lifecycle_status
                )
            `)
            .eq('exercises.lifecycle_status', 'active')
            .eq('active', true);

        if (exercise_id) {
            query = query.eq('exercise_id', exercise_id);
        }

        const { data: roles, error: dbError } = await query.order('exercise_id');
        if (dbError) throw dbError;

        return Response.json({ roles, count: roles.length, user_role: user.role });

    } catch (err) {
        console.error('Error fetching roles:', err);
        return serverError('Failed to fetch roles', err);
    }
}

/**
 * POST /api/roles — Create new role assignment (therapist/admin only).
 * Body: { exercise_id, region, capacity, contribution, focus? }
 */
export async function POST(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    if (user.role !== 'therapist' && user.role !== 'admin') {
        return forbidden('Only therapists and admins can create role assignments');
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const { exercise_id, region, capacity, focus, contribution } = body;

    if (!exercise_id || !region || !capacity || !contribution) {
        return badRequest('Missing required fields: exercise_id, region, capacity, contribution');
    }

    const validContributions = ['high', 'medium', 'low'];
    if (!validContributions.includes(contribution)) {
        return badRequest(`contribution must be one of: ${validContributions.join(', ')}`);
    }

    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data: existing } = await supabase
            .from('exercise_roles')
            .select('id')
            .eq('exercise_id', exercise_id)
            .eq('region', region)
            .eq('capacity', capacity)
            .eq('focus', focus || null)
            .maybeSingle();

        if (existing) {
            return Response.json(
                { error: 'This role assignment already exists for this exercise' },
                { status: 409 }
            );
        }

        const { data: role, error: dbError } = await supabase
            .from('exercise_roles')
            .insert([{ exercise_id, region, capacity, focus: focus || null, contribution }])
            .select()
            .single();

        if (dbError) throw dbError;

        return Response.json({ role }, { status: 201 });

    } catch (err) {
        console.error('Error creating role:', err);
        return serverError('Failed to create role', err);
    }
}

/**
 * DELETE /api/roles?id=X — Soft-delete a role assignment (sets active=false).
 * Only therapists and admins can delete.
 */
export async function DELETE(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    if (user.role !== 'therapist' && user.role !== 'admin') {
        return forbidden('Only therapists and admins can delete role assignments');
    }

    const roleId = request.nextUrl.searchParams.get('id');
    if (!roleId) return badRequest('Missing role id');

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
