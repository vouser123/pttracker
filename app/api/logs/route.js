// app/api/logs/route.js — Activity logs: GET (list), POST (create), PATCH (update), DELETE.

import { getSupabaseAdmin, getSupabaseWithAuth } from '../../../lib/db.js';
import { authenticateRoute, unauthorized, badRequest, serverError } from '../../../lib/route-auth.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Batch a Supabase .in() query to avoid PostgREST URL length limits.
 */
async function batchedIn(supabase, table, column, ids, { select = '*', order } = {}) {
    const CHUNK_SIZE = 200;
    const results = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        let query = supabase.from(table).select(select).in(column, chunk);
        if (order) query = query.order(order);
        const { data, error } = await query;
        if (error) throw error;
        if (data) results.push(...data);
    }
    return results;
}

/**
 * GET /api/logs?patient_id=X&limit=N&days=N&before=ISO&include_all=true
 *
 * Returns activity logs with nested sets + form data.
 * Pagination: use 'before' cursor (oldest performed_at from previous page).
 */
export async function GET(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const supabase = getSupabaseWithAuth(accessToken);
    const sp = request.nextUrl.searchParams;

    const patient_id = sp.get('patient_id');
    const limit = sp.get('limit');
    const days = sp.get('days');
    const before = sp.get('before');
    const include_all = sp.get('include_all');

    const targetPatientId = patient_id || user.id;
    const recordLimit = parseInt(limit) || 300;
    const dayRange = parseInt(days) || 14;
    const includeAll = include_all === 'true' || include_all === '1';
    const beforeCursor = before ? new Date(before) : null;

    try {
        const dateCutoff = new Date();
        dateCutoff.setDate(dateCutoff.getDate() - dayRange);

        let query = supabase
            .from('patient_activity_logs')
            .select('*')
            .eq('patient_id', targetPatientId)
            .order('performed_at', { ascending: false });

        if (beforeCursor && !isNaN(beforeCursor.getTime())) {
            query = query.lt('performed_at', beforeCursor.toISOString());
        }

        if (!includeAll) {
            query = query.gte('performed_at', dateCutoff.toISOString());
        }

        query = query.limit(recordLimit);

        const { data: logs, error: logsError } = await query;
        if (logsError) throw logsError;

        const logIds = logs.map(log => log.id);
        let sets = [];
        if (logIds.length > 0) {
            sets = await batchedIn(supabase, 'patient_activity_sets', 'activity_log_id', logIds, { order: 'set_number' });
        }

        const setIds = sets.map(set => set.id);
        let formDataBySet = {};
        if (setIds.length > 0) {
            const formDataRows = await batchedIn(supabase, 'patient_activity_set_form_data', 'activity_set_id', setIds);
            formDataBySet = formDataRows.reduce((acc, row) => {
                if (!acc[row.activity_set_id]) acc[row.activity_set_id] = [];
                acc[row.activity_set_id].push({
                    parameter_name: row.parameter_name,
                    parameter_value: row.parameter_value,
                    parameter_unit: row.parameter_unit,
                });
                return acc;
            }, {});
        }

        const setsByLog = sets.reduce((acc, set) => {
            if (!acc[set.activity_log_id]) acc[set.activity_log_id] = [];
            acc[set.activity_log_id].push({ ...set, form_data: formDataBySet[set.id] || null });
            return acc;
        }, {});

        const logsWithSets = logs.map(log => ({ ...log, sets: setsByLog[log.id] || [] }));
        const hasMore = logs.length === recordLimit;
        const oldestPerformedAt = logs.length > 0 ? logs[logs.length - 1].performed_at : null;

        return Response.json({
            logs: logsWithSets,
            count: logsWithSets.length,
            hasMore,
            nextCursor: hasMore ? oldestPerformedAt : null,
        });

    } catch (err) {
        console.error('Error fetching activity logs:', err);
        return serverError('Failed to fetch activity logs', err);
    }
}

/**
 * POST /api/logs — Create new activity log with sets (atomic RPC).
 * Body: { patient_id?, exercise_id?, exercise_name, activity_type, notes?, performed_at, client_mutation_id, sets[] }
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

    const { patient_id, exercise_id, exercise_name, activity_type, notes, performed_at, client_mutation_id, sets } = body;

    const targetPatientId = patient_id || user.id;

    if (patient_id && patient_id !== user.id) {
        if (user.role !== 'therapist' && user.role !== 'admin') {
            return Response.json({ error: 'Only therapists or admins may log on behalf of a patient' }, { status: 403 });
        }

        if (user.role === 'therapist') {
            const supabaseAdmin = getSupabaseAdmin();
            const { data: patientRecord, error: patientError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('id', patient_id)
                .eq('therapist_id', user.id)
                .single();

            if (patientError || !patientRecord) {
                return Response.json({ error: 'Patient is not assigned to this therapist' }, { status: 403 });
            }
        }
    }

    if (!exercise_name || !activity_type || !performed_at || !client_mutation_id || !sets || !Array.isArray(sets)) {
        return badRequest('Missing required fields: exercise_name, activity_type, performed_at, client_mutation_id, sets');
    }

    if (!['reps', 'hold', 'duration', 'distance'].includes(activity_type)) {
        return badRequest('Invalid activity_type. Must be: reps, hold, duration, distance');
    }

    for (let i = 0; i < sets.length; i++) {
        if (typeof sets[i].set_number !== 'number' || sets[i].set_number < 1) {
            return badRequest(`Invalid set_number at index ${i} — must be a positive integer`);
        }
    }

    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_activity_log_atomic', {
            p_patient_id:         targetPatientId,
            p_exercise_id:        exercise_id || null,
            p_exercise_name:      exercise_name,
            p_client_mutation_id: client_mutation_id,
            p_activity_type:      activity_type,
            p_notes:              notes || null,
            p_performed_at:       performed_at,
            p_client_created_at:  new Date().toISOString(),
            p_sets:               sets,
        });

        if (rpcError) {
            if (rpcError.code === '23505') {
                return Response.json({ error: 'Duplicate activity log (client_mutation_id already exists)' }, { status: 409 });
            }
            throw rpcError;
        }

        if (rpcResult?.duplicate === true) {
            return Response.json({ error: 'Duplicate activity log (client_mutation_id already exists)' }, { status: 409 });
        }

        const logId = rpcResult.log_id;

        const [{ data: log, error: logFetchError }, { data: createdSets, error: setsFetchError }] = await Promise.all([
            supabase.from('patient_activity_logs').select('*').eq('id', logId).single(),
            supabase.from('patient_activity_sets').select('*').eq('activity_log_id', logId).order('set_number'),
        ]);

        if (logFetchError) throw logFetchError;
        if (setsFetchError) throw setsFetchError;

        return Response.json({ log: { ...log, sets: createdSets } }, { status: 201 });

    } catch (err) {
        console.error('Error creating activity log:', err);
        return serverError('Failed to create activity log', err);
    }
}

/**
 * PATCH /api/logs?id=X — Update activity log (performed_at, notes, sets).
 * Body: { performed_at?, notes?, sets? }
 */
export async function PATCH(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return badRequest('Missing log id');
    if (!UUID_RE.test(id)) return badRequest('Invalid log id format');

    let body;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const { performed_at, notes, sets } = body;
    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data: existing, error: fetchError } = await supabase
            .from('patient_activity_logs')
            .select('id, patient_id')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) return Response.json({ error: 'Activity log not found' }, { status: 404 });

        const updates = {};
        if (performed_at !== undefined) updates.performed_at = performed_at;
        if (notes !== undefined) updates.notes = notes;

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase.from('patient_activity_logs').update(updates).eq('id', id);
            if (updateError) throw updateError;
        }

        if (sets && Array.isArray(sets)) {
            const { data: existingSets } = await supabase.from('patient_activity_sets').select('id').eq('activity_log_id', id);

            if (existingSets && existingSets.length > 0) {
                const existingSetIds = existingSets.map(s => s.id);
                const { error: formDeleteError } = await supabase.from('patient_activity_set_form_data').delete().in('activity_set_id', existingSetIds);
                if (formDeleteError) throw formDeleteError;
                const { error: setsDeleteError } = await supabase.from('patient_activity_sets').delete().eq('activity_log_id', id);
                if (setsDeleteError) throw setsDeleteError;
            }

            const setsWithLogId = sets.map((set, index) => ({
                activity_log_id: id,
                set_number: set.set_number || index + 1,
                reps: set.reps || null,
                seconds: set.seconds || null,
                distance_feet: set.distance_feet || null,
                side: set.side || null,
                manual_log: set.manual_log || false,
                partial_rep: set.partial_rep || false,
                performed_at: set.performed_at || performed_at || new Date().toISOString(),
            }));

            const { data: createdSets, error: setsError } = await supabase.from('patient_activity_sets').insert(setsWithLogId).select();
            if (setsError) throw setsError;

            // DN-004: match form_data to sets by set_number, not array index
            const createdSetByNumber = new Map(createdSets.map(s => [s.set_number, s]));
            const formDataRows = [];

            for (let i = 0; i < sets.length; i++) {
                const set = sets[i];
                const resolvedSetNumber = setsWithLogId[i].set_number;
                const createdSet = createdSetByNumber.get(resolvedSetNumber);
                if (!createdSet) {
                    throw new Error(`No created set found for set_number ${resolvedSetNumber} — clinical data integrity error`);
                }

                if (set.form_data && Array.isArray(set.form_data) && set.form_data.length > 0) {
                    for (const param of set.form_data) {
                        formDataRows.push({
                            activity_set_id: createdSet.id,
                            parameter_name: param.parameter_name,
                            parameter_value: param.parameter_value,
                            parameter_unit: param.parameter_unit || null,
                        });
                    }
                }
            }

            if (formDataRows.length > 0) {
                const { error: formDataError } = await supabase.from('patient_activity_set_form_data').insert(formDataRows);
                if (formDataError) throw formDataError;
            }
        }

        return Response.json({ success: true });

    } catch (err) {
        console.error('Error updating activity log:', err);
        return serverError('Failed to update activity log', err);
    }
}

/**
 * DELETE /api/logs?id=X — Delete an activity log and all its sets.
 */
export async function DELETE(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return badRequest('Missing log id');
    if (!UUID_RE.test(id)) return badRequest('Invalid log id format');

    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data: existing, error: fetchError } = await supabase
            .from('patient_activity_logs')
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) return Response.json({ error: 'Activity log not found' }, { status: 404 });

        const { data: existingSets } = await supabase.from('patient_activity_sets').select('id').eq('activity_log_id', id);

        if (existingSets && existingSets.length > 0) {
            await supabase.from('patient_activity_set_form_data').delete().in('activity_set_id', existingSets.map(s => s.id));
        }

        await supabase.from('patient_activity_sets').delete().eq('activity_log_id', id);

        const { error: deleteError } = await supabase.from('patient_activity_logs').delete().eq('id', id);
        if (deleteError) throw deleteError;

        return Response.json({ success: true, deleted: true });

    } catch (err) {
        console.error('Error deleting activity log:', err);
        return serverError('Failed to delete activity log', err);
    }
}
