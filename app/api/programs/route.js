// app/api/programs/route.js — GET patient programs, POST create program.

import { getSupabaseAdmin, getSupabaseWithAuth } from '../../../lib/db.js';
import {
  dosageTypeRequiresReps,
  normalizeProgramPatternModifiers,
  resolveProgramDosageType,
} from '../../../lib/programs-utils.js';
import {
  authenticateRoute,
  badRequest,
  forbidden,
  serverError,
  unauthorized,
} from '../../../lib/route-auth.js';
import { normalizeProgramMetadataFields, resolvePatientId } from './program-route-helpers.js';

/**
 * GET /api/programs?patient_id=X — Patient programs with full exercise details.
 *
 * Patients see own programs only. Therapists see their patients' programs.
 */
export async function GET(request) {
  const { user, accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  const patient_id = request.nextUrl.searchParams.get('patient_id');
  if (!patient_id) return badRequest('patient_id query parameter required');

  const { actualPatientId, patientRecord } = await resolvePatientId(user, patient_id);
  if (!actualPatientId) return Response.json({ error: 'Patient not found' }, { status: 404 });

  const isOwnAccount = user.id === actualPatientId;

  if (user.role === 'patient' && !isOwnAccount) {
    return forbidden("Cannot access other patients' programs");
  }

  if (user.role === 'therapist') {
    const supabase = getSupabaseWithAuth(accessToken);
    const patient = patientRecord?.id
      ? patientRecord
      : (await supabase.from('users').select('therapist_id').eq('id', actualPatientId).single())
          .data;

    if (!patient || patient.therapist_id !== user.id) {
      return forbidden('Patient does not belong to this therapist');
    }
  }

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const { data: programs, error: dbError } = await supabase
      .from('patient_programs')
      .select(`
                *,
                exercises (
                    id,
                    canonical_name,
                    description,
                    pt_category,
                    pattern,
                    archived,
                    lifecycle_status,
                    lifecycle_effective_start_date,
                    lifecycle_effective_end_date,
                    exercise_pattern_modifiers ( modifier ),
                    exercise_form_parameters ( parameter_name ),
                    exercise_equipment ( equipment_name, is_required ),
                    exercise_muscles ( muscle_name, is_primary ),
                    exercise_guidance ( section, content, sort_order )
                )
            `)
      .eq('patient_id', actualPatientId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    const exerciseIds = programs.map((p) => p.exercises?.id).filter(Boolean);
    let formParamsByExercise = {};

    if (exerciseIds.length > 0) {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: formParams, error: formParamsError } = await supabaseAdmin
        .from('exercise_form_parameters')
        .select('exercise_id, parameter_name')
        .in('exercise_id', exerciseIds);

      if (formParamsError) {
        console.warn('Failed to load exercise form parameters with admin client:', formParamsError);
      } else if (formParams && formParams.length > 0) {
        formParamsByExercise = formParams.reduce((acc, row) => {
          if (!acc[row.exercise_id]) acc[row.exercise_id] = [];
          acc[row.exercise_id].push({ parameter_name: row.parameter_name });
          return acc;
        }, {});
      }
    }

    const normalizedPrograms = normalizeProgramPatternModifiers(programs, formParamsByExercise);

    return Response.json({ programs: normalizedPrograms, count: normalizedPrograms.length });
  } catch (err) {
    console.error('Error fetching programs:', err);
    return serverError('Failed to fetch programs', err);
  }
}

/**
 * POST /api/programs — Create new program (assign exercise to patient).
 * Body: { patient_id, exercise_id, sets, reps_per_set?, seconds_per_rep?, seconds_per_set?, distance_feet?, dosage_type?, assignment_status?, effective_start_date?, effective_end_date? }
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

  const {
    patient_id,
    exercise_id,
    sets,
    reps_per_set,
    seconds_per_rep,
    seconds_per_set,
    distance_feet,
    dosage_type,
    assignment_status,
    effective_start_date,
    effective_end_date,
  } = body;

  const resolvedDosageType = resolveProgramDosageType({
    dosage_type,
    distance_feet,
    seconds_per_set,
    seconds_per_rep,
  });

  let resolvedSecondsPerRep = seconds_per_rep ?? null;
  let resolvedSecondsPerSet = seconds_per_set ?? null;

  if (resolvedDosageType === 'duration') {
    resolvedSecondsPerRep = null;
  } else if (resolvedDosageType === 'hold') {
    resolvedSecondsPerSet = null;
  } else if (['reps', 'distance'].includes(resolvedDosageType)) {
    resolvedSecondsPerRep = null;
    resolvedSecondsPerSet = null;
  }

  if (
    !patient_id ||
    !exercise_id ||
    !sets ||
    (!reps_per_set && dosageTypeRequiresReps(resolvedDosageType))
  ) {
    return badRequest('Missing required fields: patient_id, exercise_id, sets, reps_per_set');
  }

  if (!Number.isInteger(sets) || sets < 1) return badRequest('sets must be a positive integer');
  if (reps_per_set !== undefined && reps_per_set !== null) {
    if (!Number.isInteger(reps_per_set) || reps_per_set < 1)
      return badRequest('reps_per_set must be a positive integer');
  }
  if (seconds_per_rep !== undefined && seconds_per_rep !== null) {
    if (!Number.isInteger(seconds_per_rep) || seconds_per_rep < 0)
      return badRequest('seconds_per_rep must be a non-negative integer or null');
  }
  if (seconds_per_set !== undefined && seconds_per_set !== null) {
    if (!Number.isInteger(seconds_per_set) || seconds_per_set < 0)
      return badRequest('seconds_per_set must be a non-negative integer or null');
  }
  if (distance_feet !== undefined && distance_feet !== null) {
    if (!Number.isInteger(distance_feet) || distance_feet < 1)
      return badRequest('distance_feet must be a positive integer or null');
  }

  const metadata = normalizeProgramMetadataFields({
    assignment_status,
    effective_start_date,
    effective_end_date,
  });
  if (metadata.error) {
    return badRequest(metadata.error);
  }

  const { actualPatientId, patientRecord } = await resolvePatientId(user, patient_id);
  if (!actualPatientId) return Response.json({ error: 'Patient not found' }, { status: 404 });

  if (user.role === 'patient') {
    if (user.id !== actualPatientId) {
      return forbidden('Patients can only create programs for themselves');
    }
  } else if (user.role === 'therapist') {
    const supabase = getSupabaseWithAuth(accessToken);
    const patientLookup = patientRecord?.id
      ? { data: patientRecord, error: null }
      : await supabase.from('users').select('therapist_id').eq('id', actualPatientId).single();
    const { data: patient, error: patientError } = patientLookup;

    if (patientError) return serverError('Failed to verify patient relationship', patientError);
    if (!patient || patient.therapist_id !== user.id)
      return forbidden('Patient does not belong to this therapist');
  } else if (user.role !== 'admin') {
    return forbidden('Unauthorized to create patient programs');
  }

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const { data: existing } = await supabase
      .from('patient_programs')
      .select('id')
      .eq('patient_id', actualPatientId)
      .eq('exercise_id', exercise_id)
      .is('archived_at', null)
      .maybeSingle();

    if (existing) {
      return Response.json(
        { error: 'This exercise is already assigned to this patient. Use PUT to update instead.' },
        { status: 409 },
      );
    }

    const { data: program, error: dbError } = await supabase
      .from('patient_programs')
      .insert([
        {
          patient_id: actualPatientId,
          exercise_id,
          dosage_type: resolvedDosageType,
          sets,
          reps_per_set: reps_per_set ?? null,
          seconds_per_rep: resolvedSecondsPerRep,
          seconds_per_set: resolvedSecondsPerSet,
          distance_feet: distance_feet ?? null,
          assignment_status: metadata.updates.assignment_status ?? 'active',
          effective_start_date: metadata.updates.effective_start_date ?? null,
          effective_end_date: metadata.updates.effective_end_date ?? null,
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return Response.json({ program }, { status: 201 });
  } catch (err) {
    console.error('Error creating program:', err);
    return serverError('Failed to create program', err);
  }
}
