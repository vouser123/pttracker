// app/api/exercises/[id]/route.js — PUT (update exercise), DELETE (archive exercise).

import { getSupabaseWithAuth } from '../../../../lib/db.js';
import { authenticateRoute, unauthorized, badRequest, serverError } from '../../../../lib/route-auth.js';

// Same enums as route.js — hardcoded behavior enums approved 2026-03-19.
const VALID_PATTERNS = ['side', 'both'];
const VALID_MODIFIERS = ['duration_seconds', 'hold_seconds', 'distance_feet'];
const VALID_GUIDANCE_SECTIONS = ['motor_cues', 'compensation_warnings', 'safety_flags', 'external_cues'];
// Intentionally hardcoded behavior enum; approved by user on 2026-04-06.
// Do not extend without explicit sign-off. These values drive lifecycle behavior.
const VALID_LIFECYCLE_STATUSES = ['active', 'as_needed', 'archived', 'deprecated'];
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_ARRAY_SIZE = 100;
const MAX_GUIDANCE_ITEM_LENGTH = 500;

async function fetchValidPtCategories(supabase) {
    const { data, error } = await supabase.from('vocab_pt_category').select('code').eq('active', true);
    if (error) throw new Error(`Failed to load pt_category vocab: ${error.message}`);
    return (data ?? []).map(row => row.code);
}

function validateExerciseData(data, isUpdate = false, validPtCategories = []) {
    const errors = [];

    if (!isUpdate) {
        if (!data.id || typeof data.id !== 'string' || data.id.trim().length === 0) errors.push('id is required and must be a non-empty string');
        if (!data.canonical_name || typeof data.canonical_name !== 'string' || data.canonical_name.trim().length === 0) errors.push('canonical_name is required');
        if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) errors.push('description is required');
        if (!data.pt_category || typeof data.pt_category !== 'string') errors.push('pt_category is required');
        if (!data.pattern || typeof data.pattern !== 'string') errors.push('pattern is required');
    }

    if (data.canonical_name && data.canonical_name.length > MAX_NAME_LENGTH) errors.push(`canonical_name must be ${MAX_NAME_LENGTH} characters or less`);
    if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) errors.push(`description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
    if (data.pt_category && !validPtCategories.includes(data.pt_category)) errors.push(`pt_category must be one of: ${validPtCategories.join(', ')}`);
    if (data.pattern && !VALID_PATTERNS.includes(data.pattern)) errors.push(`pattern must be one of: ${VALID_PATTERNS.join(', ')}`);
    if (data.lifecycle_status && !VALID_LIFECYCLE_STATUSES.includes(data.lifecycle_status)) errors.push(`lifecycle_status must be one of: ${VALID_LIFECYCLE_STATUSES.join(', ')}`);

    if (data.pattern_modifiers) {
        if (!Array.isArray(data.pattern_modifiers)) {
            errors.push('pattern_modifiers must be an array');
        } else {
            if (data.pattern_modifiers.length > MAX_ARRAY_SIZE) errors.push(`pattern_modifiers cannot exceed ${MAX_ARRAY_SIZE} items`);
            const invalid = data.pattern_modifiers.filter(m => !VALID_MODIFIERS.includes(m));
            if (invalid.length > 0) errors.push(`Invalid pattern modifiers: ${invalid.join(', ')}`);
        }
    }

    if (data.equipment && typeof data.equipment !== 'object') errors.push('equipment must be an object');
    if (data.primary_muscles && !Array.isArray(data.primary_muscles)) errors.push('primary_muscles must be an array');
    if (data.secondary_muscles && !Array.isArray(data.secondary_muscles)) errors.push('secondary_muscles must be an array');
    if (data.form_parameters_required && !Array.isArray(data.form_parameters_required)) errors.push('form_parameters_required must be an array');

    if (data.guidance && typeof data.guidance === 'object') {
        for (const [section, items] of Object.entries(data.guidance)) {
            if (!VALID_GUIDANCE_SECTIONS.includes(section)) errors.push(`Invalid guidance section: ${section}`);
            if (Array.isArray(items)) {
                items.forEach((item, idx) => {
                    if (typeof item !== 'string') errors.push(`guidance.${section}[${idx}] must be a string`);
                    else if (item.length > MAX_GUIDANCE_ITEM_LENGTH) errors.push(`guidance.${section}[${idx}] exceeds ${MAX_GUIDANCE_ITEM_LENGTH} chars`);
                });
            }
        }
    }

    if (data.lifecycle_effective_start_date && data.lifecycle_effective_end_date) {
        const start = new Date(data.lifecycle_effective_start_date);
        const end = new Date(data.lifecycle_effective_end_date);
        if (start > end) errors.push('lifecycle_effective_start_date must be before lifecycle_effective_end_date');
    }

    return errors;
}

/**
 * PUT /api/exercises/:id — Update exercise and all related data.
 * Body: exercise object or { exercise: { ... } }
 */
export async function PUT(request, { params }) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const { id: exerciseId } = await params;

    let rawBody;
    try {
        rawBody = await request.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const payload = rawBody?.exercise ?? rawBody;

    const {
        canonical_name, description, pt_category, pattern,
        pattern_modifiers, equipment, primary_muscles, secondary_muscles,
        form_parameters_required, guidance, lifecycle_status,
        lifecycle_effective_start_date, lifecycle_effective_end_date,
        supersedes_exercise_id,
    } = payload;

    if (supersedes_exercise_id && supersedes_exercise_id === exerciseId) {
        return badRequest('An exercise cannot supersede itself.');
    }

    const supabase = getSupabaseWithAuth(accessToken);

    let validPtCategories;
    try {
        validPtCategories = await fetchValidPtCategories(supabase);
    } catch (vocabError) {
        return serverError('Failed to load validation data', vocabError);
    }

    const validationErrors = validateExerciseData(payload, true, validPtCategories);
    if (validationErrors.length > 0) {
        return Response.json({ error: 'Validation failed', details: validationErrors }, { status: 400 });
    }

    try {
        const { data: existing, error: existingError } = await supabase.from('exercises').select('*').eq('id', exerciseId).single();
        if (existingError || !existing) return Response.json({ error: 'Exercise not found' }, { status: 404 });

        const updates = { updated_date: new Date().toISOString() };
        if (canonical_name !== undefined) updates.canonical_name = canonical_name;
        if (description !== undefined) updates.description = description;
        if (pt_category !== undefined) updates.pt_category = pt_category;
        if (pattern !== undefined) updates.pattern = pattern;
        if (lifecycle_status !== undefined) {
            updates.lifecycle_status = lifecycle_status;
            updates.archived = lifecycle_status === 'archived';
        }
        if (lifecycle_effective_start_date !== undefined) updates.lifecycle_effective_start_date = lifecycle_effective_start_date;
        if (lifecycle_effective_end_date !== undefined) updates.lifecycle_effective_end_date = lifecycle_effective_end_date;
        if (supersedes_exercise_id !== undefined) updates.supersedes_exercise_id = supersedes_exercise_id || null;

        const { data: exercise, error: updateError } = await supabase.from('exercises').update(updates).eq('id', exerciseId).select().single();
        if (updateError) throw updateError;

        // Bi-directional supersedes link maintenance
        if (supersedes_exercise_id !== undefined) {
            const oldSupersedes = existing.supersedes_exercise_id ?? null;
            const newSupersedes = supersedes_exercise_id || null;

            if (oldSupersedes !== newSupersedes) {
                if (oldSupersedes) {
                    await supabase.from('exercises')
                        .update({ superseded_by_exercise_id: null, superseded_date: null, updated_date: new Date().toISOString() })
                        .eq('id', oldSupersedes)
                        .eq('superseded_by_exercise_id', exerciseId);
                }
                if (newSupersedes) {
                    await supabase.from('exercises')
                        .update({ superseded_by_exercise_id: exerciseId, superseded_date: new Date().toISOString(), updated_date: new Date().toISOString() })
                        .eq('id', newSupersedes);
                }
            }
        }

        if (pattern_modifiers !== undefined) {
            await supabase.from('exercise_pattern_modifiers').delete().eq('exercise_id', exerciseId);
            if (pattern_modifiers.length > 0) {
                const { error: modError } = await supabase.from('exercise_pattern_modifiers').insert(pattern_modifiers.map(modifier => ({ exercise_id: exerciseId, modifier })));
                if (modError) throw modError;
            }
        }

        if (equipment !== undefined) {
            await supabase.from('exercise_equipment').delete().eq('exercise_id', exerciseId);
            const equipmentRows = [
                ...(equipment.required || []).map(name => ({ exercise_id: exerciseId, equipment_name: name, is_required: true })),
                ...(equipment.optional || []).map(name => ({ exercise_id: exerciseId, equipment_name: name, is_required: false })),
            ];
            if (equipmentRows.length > 0) {
                const { error: eqError } = await supabase.from('exercise_equipment').insert(equipmentRows);
                if (eqError) throw eqError;
            }
        }

        if (primary_muscles !== undefined || secondary_muscles !== undefined) {
            await supabase.from('exercise_muscles').delete().eq('exercise_id', exerciseId);
            const muscleRows = [
                ...(primary_muscles || []).map(name => ({ exercise_id: exerciseId, muscle_name: name, is_primary: true })),
                ...(secondary_muscles || []).map(name => ({ exercise_id: exerciseId, muscle_name: name, is_primary: false })),
            ];
            if (muscleRows.length > 0) {
                const { error: muscleError } = await supabase.from('exercise_muscles').insert(muscleRows);
                if (muscleError) throw muscleError;
            }
        }

        if (form_parameters_required !== undefined) {
            await supabase.from('exercise_form_parameters').delete().eq('exercise_id', exerciseId);
            if (form_parameters_required.length > 0) {
                const { error: paramError } = await supabase.from('exercise_form_parameters').insert(form_parameters_required.map(name => ({ exercise_id: exerciseId, parameter_name: name })));
                if (paramError) throw paramError;
            }
        }

        if (guidance !== undefined) {
            await supabase.from('exercise_guidance').delete().eq('exercise_id', exerciseId);
            const guidanceRows = [];
            for (const [section, items] of Object.entries(guidance)) {
                items.forEach((content, index) => guidanceRows.push({ exercise_id: exerciseId, section, content, sort_order: index }));
            }
            if (guidanceRows.length > 0) {
                const { error: guidanceError } = await supabase.from('exercise_guidance').insert(guidanceRows);
                if (guidanceError) throw guidanceError;
            }
        }

        return Response.json({ exercise });

    } catch (err) {
        console.error('Error updating exercise:', err);
        return serverError('Failed to update exercise', err);
    }
}

/**
 * DELETE /api/exercises/:id — Archive exercise (soft delete: lifecycle_status=archived).
 */
export async function DELETE(request, { params }) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const { id: exerciseId } = await params;
    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data: exercise, error: dbError } = await supabase
            .from('exercises')
            .update({
                archived: true,
                lifecycle_status: 'archived',
                updated_date: new Date().toISOString(),
            })
            .eq('id', exerciseId)
            .select()
            .single();

        if (dbError) throw dbError;

        if (!exercise) return Response.json({ error: 'Exercise not found' }, { status: 404 });

        return Response.json({ exercise });

    } catch (err) {
        console.error('Error deleting exercise:', err);
        return serverError('Failed to delete exercise', err);
    }
}
