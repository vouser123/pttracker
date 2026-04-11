// app/api/vocab/route.js — CRUD for controlled vocabulary tables.

import { getSupabaseWithAuth } from '../../../lib/db.js';
import {
  authenticateRoute,
  badRequest,
  forbidden,
  serverError,
  unauthorized,
} from '../../../lib/route-auth.js';

const VOCAB_TABLES = [
  'vocab_region',
  'vocab_capacity',
  'vocab_contribution',
  'vocab_focus',
  'vocab_pt_category',
  'vocab_pattern',
];

function getValidTableName(table) {
  if (!table) return null;
  const tableName = table.startsWith('vocab_') ? table : `vocab_${table}`;
  return VOCAB_TABLES.includes(tableName) ? tableName : null;
}

/**
 * GET /api/vocab
 * GET /api/vocab?table=region — specific vocabulary table
 *
 * Returns all active vocabulary items, optionally filtered to one table.
 */
export async function GET(request) {
  const { accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  const supabase = getSupabaseWithAuth(accessToken);
  const table = request.nextUrl.searchParams.get('table');

  try {
    if (table) {
      const tableName = getValidTableName(table);
      if (!tableName) {
        return badRequest('Invalid vocabulary table');
      }

      const { data, error: dbError } = await supabase
        .from(tableName)
        .select('*')
        .eq('active', true)
        .order('sort_order');

      if (dbError) throw dbError;

      return Response.json({ table: tableName, items: data, count: data.length });
    }

    const result = {};
    for (const tableName of VOCAB_TABLES) {
      const { data, error: dbError } = await supabase
        .from(tableName)
        .select('*')
        .eq('active', true)
        .order('sort_order');

      if (dbError) {
        console.error(`Error fetching ${tableName}:`, dbError);
        continue;
      }

      const key = tableName.replace('vocab_', '');
      result[key] = data;
    }

    return Response.json({ vocabularies: result });
  } catch (err) {
    console.error('Error fetching vocabularies:', err);
    return serverError('Failed to fetch vocabularies', err);
  }
}

/**
 * POST /api/vocab — Add new vocabulary term (therapist/admin only).
 * Body: { table, code, definition, sort_order? }
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

  const { table, code, definition, sort_order } = body;
  const tableName = getValidTableName(table);
  if (!tableName) return badRequest('Invalid vocabulary table');
  if (!code || !definition) return badRequest('code and definition are required');

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    let order = sort_order;
    if (order === undefined) {
      const { data: maxData } = await supabase
        .from(tableName)
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      order = (maxData?.[0]?.sort_order || 0) + 1;
    }

    const { data, error: dbError } = await supabase
      .from(tableName)
      .insert({
        code: code.toLowerCase().replace(/\s+/g, '_'),
        definition,
        sort_order: order,
        active: true,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return Response.json({ success: true, item: data }, { status: 201 });
  } catch (err) {
    console.error('Error adding vocabulary:', err);
    return serverError('Failed to add vocabulary term', err);
  }
}

/**
 * PUT /api/vocab — Update vocabulary term (therapist/admin only).
 * Body: { table, code, definition?, sort_order?, active? }
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

  const { table, code, definition, sort_order, active } = body;
  const tableName = getValidTableName(table);
  if (!tableName) return badRequest('Invalid vocabulary table');
  if (!code) return badRequest('code is required');

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const updates = { updated_at: new Date().toISOString() };
    if (definition !== undefined) updates.definition = definition;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (active !== undefined) updates.active = active;

    const { data, error: dbError } = await supabase
      .from(tableName)
      .update(updates)
      .eq('code', code)
      .select()
      .single();

    if (dbError) throw dbError;

    return Response.json({ success: true, item: data });
  } catch (err) {
    console.error('Error updating vocabulary:', err);
    return serverError('Failed to update vocabulary term', err);
  }
}

/**
 * DELETE /api/vocab?table=X&code=Y — Soft-delete vocabulary term (therapist/admin only).
 */
export async function DELETE(request) {
  const { user, accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  if (user.role !== 'therapist' && user.role !== 'admin') {
    return forbidden('Therapist or admin access required');
  }

  const sp = request.nextUrl.searchParams;
  const table = sp.get('table');
  const code = sp.get('code');

  const tableName = getValidTableName(table);
  if (!tableName) return badRequest('Invalid vocabulary table');
  if (!code) return badRequest('code query parameter is required');

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const { error: dbError } = await supabase
      .from(tableName)
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('code', code)
      .select()
      .single();

    if (dbError) throw dbError;

    return Response.json({ success: true, deleted: code });
  } catch (err) {
    console.error('Error deleting vocabulary:', err);
    return serverError('Failed to delete vocabulary term', err);
  }
}
