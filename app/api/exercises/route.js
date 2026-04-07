// app/api/exercises/route.js — GET (list all exercises), POST (create exercise).

import { getSupabaseWithAuth } from '../../../lib/db.js';
import { buildExerciseLifecycle } from '../../../lib/exercise-lifecycle.js';
import { authenticateRoute, unauthorized, badRequest, serverError } from '../../../lib/route-auth.js';

// Intentionally hardcoded behavior enums; approved by user on 2026-03-19.
const VALID_PATTERNS = ['side', 'both'];
const VALID_MODIFIERS = ['duration_seconds', 'hold_seconds', 'distance_feet'];
const VALID_GUIDANCE_SECTIONS = ['motor_cues', 'compensation_warnings', 'safety_flags', 'external_cues'];
// Intentionally hardcoded behavior enum; approved by user on 2026-04-07.
// Do not extend without explicit sign-off. These values drive lifecycle behavior.
const VALID_LIFECYCLE_STATUSES = ['active', 'on_hold', 'as_needed', 'archived', 'deprecated'];
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_ARRAY_SIZE = 100;
const MAX_GUIDANCE_ITEM_LENGTH = 500;

function groupBy(array, key) {
    if (!array) return {};
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) result[group] = [];
        result[group].push(item);
        return result;
    }, {});
}

function groupGuidance(guidanceArray) {
    const grouped = groupBy(guidanceArray, 'section');
    const result = {};
    for (const [section, items] of Object.entries(grouped)) {
        result[section] = items.map(item => item.content);
    }
    return result;
}

async function fetchValidPtCategories(supabase) {
    const { data, error } = await supabase.from('vocab_pt_category').select('code').eq('active', true);
    if (error) throw new Error(`Failed to load pt_category vocab: ${error.message}`);
    return (data ?? []).map(row => row.code);
}

function validateExerciseData(data, isUpdate = false, validPtCategories = []) {
    const errors = [];

    if (!isUpdate) {
        if (!data.id || typeof data.id !== 'string' || data.id.trim().length === 0) errors.push('id is required and must be a non-empty string');
        if (!data.canonical_name || typeof data.canonical_name !== 'string' || data.canonical_name.trim().length === 0) errors.push('canonical_name is required and must be a non-empty string');
        if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) errors.push('description is required and must be a non-empty string');
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
            if (invalid.length > 0) errors.push(`Invalid pattern modifiers: ${invalid.join(', ')}. Must be one of: ${VALID_MODIFIERS.join(', ')}`);
        }
    }

    if (data.equipment) {
        if (typeof data.equipment !== 'object') {
            errors.push('equipment must be an object with required and optional arrays');
        } else {
            if (data.equipment.required && !Array.isArray(data.equipment.required)) errors.push('equipment.required must be an array');
            if (data.equipment.optional && !Array.isArray(data.equipment.optional)) errors.push('equipment.optional must be an array');
            const total = (data.equipment.required || []).length + (data.equipment.optional || []).length;
            if (total > MAX_ARRAY_SIZE) errors.push(`Total equipment cannot exceed ${MAX_ARRAY_SIZE} items`);
        }
    }

    if (data.primary_muscles && !Array.isArray(data.primary_muscles)) errors.push('primary_muscles must be an array');
    if (data.secondary_muscles && !Array.isArray(data.secondary_muscles)) errors.push('secondary_muscles must be an array');
    const totalMuscles = (data.primary_muscles || []).length + (data.secondary_muscles || []).length;
    if (totalMuscles > MAX_ARRAY_SIZE) errors.push(`Total muscles cannot exceed ${MAX_ARRAY_SIZE} items`);

    if (data.form_parameters_required && !Array.isArray(data.form_parameters_required)) errors.push('form_parameters_required must be an array');
    if (data.form_parameters_required && data.form_parameters_required.length > MAX_ARRAY_SIZE) errors.push(`form_parameters_required cannot exceed ${MAX_ARRAY_SIZE} items`);

    if (data.guidance) {
        if (typeof data.guidance !== 'object') {
            errors.push('guidance must be an object');
        } else {
            for (const [section, items] of Object.entries(data.guidance)) {
                if (!VALID_GUIDANCE_SECTIONS.includes(section)) errors.push(`Invalid guidance section: ${section}. Must be one of: ${VALID_GUIDANCE_SECTIONS.join(', ')}`);
                if (!Array.isArray(items)) {
                    errors.push(`guidance.${section} must be an array`);
                } else {
                    if (items.length > MAX_ARRAY_SIZE) errors.push(`guidance.${section} cannot exceed ${MAX_ARRAY_SIZE} items`);
                    items.forEach((item, idx) => {
                        if (typeof item !== 'string') errors.push(`guidance.${section}[${idx}] must be a string`);
                        else if (item.length > MAX_GUIDANCE_ITEM_LENGTH) errors.push(`guidance.${section}[${idx}] exceeds ${MAX_GUIDANCE_ITEM_LENGTH} character limit`);
                    });
                }
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
 * GET /api/exercises — List all exercises with full related data.
 */
export async function GET(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    const supabase = getSupabaseWithAuth(accessToken);

    try {
        const { data: exercises, error: exercisesError } = await supabase.from('exercises').select('*').order('canonical_name');
        if (exercisesError) throw exercisesError;

        const [
            { data: equipment },
            { data: muscles },
            { data: modifiers },
            { data: formParams },
            { data: guidance },
            { data: roles },
        ] = await Promise.all([
            supabase.from('exercise_equipment').select('*'),
            supabase.from('exercise_muscles').select('*'),
            supabase.from('exercise_pattern_modifiers').select('*'),
            supabase.from('exercise_form_parameters').select('*'),
            supabase.from('exercise_guidance').select('*').order('sort_order'),
            supabase.from('exercise_roles').select('*').eq('active', true),
        ]);

        const equipmentByExercise = groupBy(equipment, 'exercise_id');
        const musclesByExercise = groupBy(muscles, 'exercise_id');
        const modifiersByExercise = groupBy(modifiers, 'exercise_id');
        const formParamsByExercise = groupBy(formParams, 'exercise_id');
        const guidanceByExercise = groupBy(guidance, 'exercise_id');
        const rolesByExercise = groupBy(roles, 'exercise_id');

        const fullExercises = exercises.map(ex => ({
            id: ex.id,
            canonical_name: ex.canonical_name,
            description: ex.description,
            pt_category: ex.pt_category,
            pattern: ex.pattern,
            archived: ex.archived,
            lifecycle: buildExerciseLifecycle(ex),
            supersedes: ex.supersedes_exercise_id ? [ex.supersedes_exercise_id] : null,
            superseded_by: ex.superseded_by_exercise_id,
            superseded_date: ex.superseded_date,
            added_date: ex.added_date,
            updated_date: ex.updated_date,
            equipment: {
                required: (equipmentByExercise[ex.id] || []).filter(e => e.is_required).map(e => e.equipment_name),
                optional: (equipmentByExercise[ex.id] || []).filter(e => !e.is_required).map(e => e.equipment_name),
            },
            primary_muscles: (musclesByExercise[ex.id] || []).filter(m => m.is_primary).map(m => m.muscle_name),
            secondary_muscles: (musclesByExercise[ex.id] || []).filter(m => !m.is_primary).map(m => m.muscle_name),
            pattern_modifiers: (modifiersByExercise[ex.id] || []).map(m => m.modifier),
            form_parameters_required: (formParamsByExercise[ex.id] || []).map(p => p.parameter_name),
            guidance: groupGuidance(guidanceByExercise[ex.id] || []),
            roles: (rolesByExercise[ex.id] || []).map(r => ({
                id: r.id,
                region: r.region,
                capacity: r.capacity,
                focus: r.focus,
                contribution: r.contribution,
            })),
        }));

        return Response.json({ exercises: fullExercises, count: fullExercises.length });

    } catch (err) {
        console.error('Error fetching exercises:', err);
        return serverError('Failed to fetch exercises', err);
    }
}

/**
 * POST /api/exercises — Create a new exercise with all related data.
 * Body: exercise object or { exercise: { ... } }
 */
export async function POST(request) {
    const { user, accessToken, error } = await authenticateRoute(request);
    if (error) return unauthorized(error);

    let rawBody;
    try {
        rawBody = await request.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const payload = rawBody?.exercise ?? rawBody;

    const {
        id,
        canonical_name,
        description,
        pt_category,
        pattern,
        pattern_modifiers = [],
        equipment = { required: [], optional: [] },
        primary_muscles = [],
        secondary_muscles = [],
        form_parameters_required = [],
        guidance = {},
        lifecycle_status = 'active',
        lifecycle_effective_start_date = null,
        lifecycle_effective_end_date = null,
        supersedes_exercise_id = null,
    } = payload;

    const normalizedLifecycleStatus = lifecycle_status || 'active';

    const supabase = getSupabaseWithAuth(accessToken);

    let validPtCategories;
    try {
        validPtCategories = await fetchValidPtCategories(supabase);
    } catch (vocabError) {
        return serverError('Failed to load validation data', vocabError);
    }

    const validationErrors = validateExerciseData(payload, false, validPtCategories);
    if (validationErrors.length > 0) {
        return Response.json({ error: 'Validation failed', details: validationErrors }, { status: 400 });
    }

    try {
        const { data: existing } = await supabase.from('exercises').select('id').eq('id', id).single();
        if (existing) {
            return Response.json(
                { error: `An exercise with the ID '${id}' already exists. Please use a different canonical name or edit the existing exercise.` },
                { status: 409 }
            );
        }

        const { data: exercise, error: exerciseError } = await supabase
            .from('exercises')
            .insert({
                id, canonical_name, description, pt_category, pattern,
                archived: normalizedLifecycleStatus === 'archived',
                lifecycle_status: normalizedLifecycleStatus,
                lifecycle_effective_start_date, lifecycle_effective_end_date,
                supersedes_exercise_id: supersedes_exercise_id || null,
                added_date: new Date().toISOString(),
            })
            .select()
            .single();

        if (exerciseError) throw exerciseError;

        if (pattern_modifiers.length > 0) {
            const { error: modError } = await supabase.from('exercise_pattern_modifiers').insert(pattern_modifiers.map(modifier => ({ exercise_id: id, modifier })));
            if (modError) throw modError;
        }

        const equipmentRows = [
            ...(equipment.required || []).map(name => ({ exercise_id: id, equipment_name: name, is_required: true })),
            ...(equipment.optional || []).map(name => ({ exercise_id: id, equipment_name: name, is_required: false })),
        ];
        if (equipmentRows.length > 0) {
            const { error: eqError } = await supabase.from('exercise_equipment').insert(equipmentRows);
            if (eqError) throw eqError;
        }

        const muscleRows = [
            ...primary_muscles.map(name => ({ exercise_id: id, muscle_name: name, is_primary: true })),
            ...secondary_muscles.map(name => ({ exercise_id: id, muscle_name: name, is_primary: false })),
        ];
        if (muscleRows.length > 0) {
            const { error: muscleError } = await supabase.from('exercise_muscles').insert(muscleRows);
            if (muscleError) throw muscleError;
        }

        if (form_parameters_required.length > 0) {
            const { error: paramError } = await supabase.from('exercise_form_parameters').insert(form_parameters_required.map(name => ({ exercise_id: id, parameter_name: name })));
            if (paramError) throw paramError;
        }

        const guidanceRows = [];
        for (const [section, items] of Object.entries(guidance)) {
            items.forEach((content, index) => guidanceRows.push({ exercise_id: id, section, content, sort_order: index }));
        }
        if (guidanceRows.length > 0) {
            const { error: guidanceError } = await supabase.from('exercise_guidance').insert(guidanceRows);
            if (guidanceError) throw guidanceError;
        }

        if (supersedes_exercise_id) {
            await supabase.from('exercises')
                .update({ superseded_by_exercise_id: id, superseded_date: new Date().toISOString(), updated_date: new Date().toISOString() })
                .eq('id', supersedes_exercise_id);
        }

        return Response.json({ exercise }, { status: 201 });

    } catch (err) {
        console.error('Error creating exercise:', err);
        try {
            await supabase.from('exercises').delete().eq('id', id);
        } catch (cleanupErr) {
            console.error('Error cleaning up failed exercise creation:', cleanupErr);
        }
        return serverError('Failed to create exercise', err);
    }
}
