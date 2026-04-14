// app/api/programs/batch/assign/route.js — batch-create patient program assignments.

import { getSupabaseWithAuth } from '../../../../../lib/db.js';
import {
  dosageTypeRequiresReps,
  resolveProgramDosageType,
} from '../../../../../lib/programs-utils.js';
import {
  authenticateRoute,
  badRequest,
  serverError,
  unauthorized,
} from '../../../../../lib/route-auth.js';
import {
  normalizeProgramMetadataFields,
  resolvePatientId,
  verifyProgramPatientAccess,
} from '../../program-route-helpers.js';

function validateAssignmentItem(item, index, patientId) {
  const {
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
  } = item ?? {};

  if (!exercise_id || !sets) {
    return { error: `assignments[${index}] is missing required fields: exercise_id, sets` };
  }

  const resolvedDosageType = resolveProgramDosageType({
    dosage_type,
    distance_feet,
    seconds_per_set,
    seconds_per_rep,
  });

  if (!reps_per_set && dosageTypeRequiresReps(resolvedDosageType)) {
    return { error: `assignments[${index}] is missing required field: reps_per_set` };
  }

  if (!Number.isInteger(sets) || sets < 1) {
    return { error: `assignments[${index}].sets must be a positive integer` };
  }

  if (reps_per_set !== undefined && reps_per_set !== null) {
    if (!Number.isInteger(reps_per_set) || reps_per_set < 1) {
      return { error: `assignments[${index}].reps_per_set must be a positive integer` };
    }
  }

  if (seconds_per_rep !== undefined && seconds_per_rep !== null) {
    if (!Number.isInteger(seconds_per_rep) || seconds_per_rep < 0) {
      return {
        error: `assignments[${index}].seconds_per_rep must be a non-negative integer or null`,
      };
    }
  }

  if (seconds_per_set !== undefined && seconds_per_set !== null) {
    if (!Number.isInteger(seconds_per_set) || seconds_per_set < 0) {
      return {
        error: `assignments[${index}].seconds_per_set must be a non-negative integer or null`,
      };
    }
  }

  if (distance_feet !== undefined && distance_feet !== null) {
    if (!Number.isInteger(distance_feet) || distance_feet < 1) {
      return { error: `assignments[${index}].distance_feet must be a positive integer or null` };
    }
  }

  const metadata = normalizeProgramMetadataFields({
    assignment_status,
    effective_start_date,
    effective_end_date,
  });
  if (metadata.error) {
    return { error: `assignments[${index}]: ${metadata.error}` };
  }

  let resolvedSecondsPerRep = seconds_per_rep ?? null;
  let resolvedSecondsPerSet = seconds_per_set ?? null;

  if (resolvedDosageType === 'duration') {
    resolvedSecondsPerRep = null;
  } else if (resolvedDosageType === 'hold') {
    resolvedSecondsPerSet = null;
  } else if (resolvedDosageType === 'reps' || resolvedDosageType === 'distance') {
    resolvedSecondsPerRep = null;
    resolvedSecondsPerSet = null;
  }

  return {
    row: {
      patient_id: patientId,
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
  };
}

/**
 * POST /api/programs/batch/assign — Batch-create patient program assignments.
 * Body: { patient_id, assignments: [{ exercise_id, sets, reps_per_set?, seconds_per_rep?, seconds_per_set?, distance_feet?, dosage_type?, assignment_status?, effective_start_date?, effective_end_date? }] }
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

  const { patient_id, assignments } = body ?? {};

  if (!patient_id) {
    return badRequest('patient_id is required');
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return badRequest('assignments must be a non-empty array');
  }

  const { actualPatientId, patientRecord } = await resolvePatientId(user, patient_id);
  if (!actualPatientId) {
    return Response.json({ error: 'Patient not found' }, { status: 404 });
  }

  try {
    const accessError = await verifyProgramPatientAccess({
      user,
      accessToken,
      patientId: actualPatientId,
      patientRecord,
      allowPatient: false,
    });
    if (accessError) return accessError;

    const exerciseIds = [];
    const rows = [];

    for (const [index, assignment] of assignments.entries()) {
      const validated = validateAssignmentItem(assignment, index, actualPatientId);
      if (validated.error) {
        return badRequest(validated.error);
      }
      exerciseIds.push(validated.row.exercise_id);
      rows.push(validated.row);
    }

    if (new Set(exerciseIds).size !== exerciseIds.length) {
      return badRequest('assignments cannot contain the same exercise_id more than once');
    }

    const supabase = getSupabaseWithAuth(accessToken);

    const { data: existingPrograms, error: existingProgramsError } = await supabase
      .from('patient_programs')
      .select('id, exercise_id')
      .eq('patient_id', actualPatientId)
      .is('archived_at', null)
      .in('exercise_id', exerciseIds);

    if (existingProgramsError) throw existingProgramsError;

    if ((existingPrograms ?? []).length > 0) {
      return Response.json(
        {
          error: 'One or more exercises are already assigned to this patient',
          existing_programs: existingPrograms,
        },
        { status: 409 },
      );
    }

    const { data: programs, error: insertError } = await supabase
      .from('patient_programs')
      .insert(rows)
      .select();

    if (insertError) throw insertError;

    return Response.json(
      { programs: programs ?? [], count: programs?.length ?? 0 },
      { status: 201 },
    );
  } catch (err) {
    console.error('Error batch assigning programs:', err);
    return serverError('Failed to batch assign programs', err);
  }
}
