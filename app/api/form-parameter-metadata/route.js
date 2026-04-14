// app/api/form-parameter-metadata/route.js — CRUD for form parameter display metadata (suffix, unit options).

import { getSupabaseWithAuth } from '../../../lib/db.js';
import {
  authenticateRoute,
  badRequest,
  forbidden,
  serverError,
  unauthorized,
} from '../../../lib/route-auth.js';

/**
 * GET /api/form-parameter-metadata
 * Returns all active form parameter metadata rows as a keyed object.
 */
export async function GET(request) {
  const { accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const { data, error: dbError } = await supabase
      .from('form_parameter_metadata')
      .select('parameter_name, display_suffix, unit_options')
      .eq('active', true)
      .order('parameter_name');

    if (dbError) throw dbError;

    return Response.json({ items: data });
  } catch (err) {
    console.error('Error fetching form parameter metadata:', err);
    return serverError('Failed to fetch form parameter metadata', err);
  }
}

/**
 * POST /api/form-parameter-metadata — Create metadata entry (therapist/admin only).
 * Body: { parameter_name, display_suffix?, unit_options? }
 */
export async function POST(request) {
  const { user, accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  if (user.role !== 'therapist' && user.role !== 'admin') {
    return forbidden('Therapist or admin access required');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { parameter_name, display_suffix, unit_options } = body;
  if (!parameter_name?.trim()) {
    return badRequest('parameter_name is required');
  }

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const { data, error: dbError } = await supabase
      .from('form_parameter_metadata')
      .insert({
        parameter_name: parameter_name.trim().toLowerCase(),
        display_suffix: display_suffix?.trim() || null,
        unit_options: Array.isArray(unit_options) && unit_options.length > 0 ? unit_options : null,
        active: true,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return Response.json({ success: true, item: data }, { status: 201 });
  } catch (err) {
    console.error('Error creating form parameter metadata:', err);
    return serverError('Failed to create form parameter metadata', err);
  }
}

/**
 * PUT /api/form-parameter-metadata — Update metadata entry (therapist/admin only).
 * Body: { parameter_name, display_suffix?, unit_options?, active? }
 */
export async function PUT(request) {
  const { user, accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  if (user.role !== 'therapist' && user.role !== 'admin') {
    return forbidden('Therapist or admin access required');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { parameter_name, display_suffix, unit_options, active } = body;
  if (!parameter_name) return badRequest('parameter_name is required');

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const updates = { updated_at: new Date().toISOString() };
    if (display_suffix !== undefined) updates.display_suffix = display_suffix?.trim() || null;
    if (unit_options !== undefined) {
      updates.unit_options =
        Array.isArray(unit_options) && unit_options.length > 0 ? unit_options : null;
    }
    if (active !== undefined) updates.active = active;

    const { data, error: dbError } = await supabase
      .from('form_parameter_metadata')
      .update(updates)
      .eq('parameter_name', parameter_name)
      .select()
      .single();

    if (dbError) throw dbError;

    return Response.json({ success: true, item: data });
  } catch (err) {
    console.error('Error updating form parameter metadata:', err);
    return serverError('Failed to update form parameter metadata', err);
  }
}

/**
 * DELETE /api/form-parameter-metadata?parameter_name=X — Soft-delete (therapist/admin only).
 */
export async function DELETE(request) {
  const { user, accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  if (user.role !== 'therapist' && user.role !== 'admin') {
    return forbidden('Therapist or admin access required');
  }

  const parameterName = request.nextUrl.searchParams.get('parameter_name');
  if (!parameterName) return badRequest('parameter_name query parameter is required');

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const { error: dbError } = await supabase
      .from('form_parameter_metadata')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('parameter_name', parameterName);

    if (dbError) throw dbError;

    return Response.json({ success: true, deleted: parameterName });
  } catch (err) {
    console.error('Error deleting form parameter metadata:', err);
    return serverError('Failed to delete form parameter metadata', err);
  }
}
