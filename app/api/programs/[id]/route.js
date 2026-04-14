// app/api/programs/[id]/route.js — PUT (update program dosage), DELETE (archive program).

import { getSupabaseWithAuth } from '../../../../lib/db.js';
import {
  dosageTypeRequiresReps,
  resolveProgramDosageType,
} from '../../../../lib/programs-utils.js';
import {
  authenticateRoute,
  badRequest,
  forbidden,
  serverError,
  unauthorized,
} from '../../../../lib/route-auth.js';
import { normalizeProgramMetadataFields } from '../program-route-helpers.js';

/**
 * PUT /api/programs/:id — Update program dosage fields.
 * Body: { sets?, reps_per_set?, seconds_per_rep?, seconds_per_set?, distance_feet?, dosage_type?, assignment_status?, effective_start_date?, effective_end_date? }
 */
export async function PUT(request, { params }) {
  const { user, accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  const { id: programId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const {
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
  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const { data: existingProgram, error: fetchError } = await supabase
      .from('patient_programs')
      .select('patient_id, dosage_type, effective_start_date, effective_end_date')
      .eq('id', programId)
      .single();

    if (fetchError || !existingProgram)
      return Response.json({ error: 'Program not found' }, { status: 404 });

    if (user.role === 'patient') {
      const isOwnAccount =
        user.id === existingProgram.patient_id || user.auth_id === existingProgram.patient_id;
      if (!isOwnAccount) return forbidden('Patients can only update their own programs');
    } else if (user.role === 'therapist') {
      const { data: patient, error: patientError } = await supabase
        .from('users')
        .select('therapist_id')
        .eq('id', existingProgram.patient_id)
        .single();

      if (patientError) return serverError('Failed to verify patient relationship', patientError);
      if (!patient || patient.therapist_id !== user.id)
        return forbidden('Patient does not belong to this therapist');
    } else if (user.role !== 'admin') {
      return forbidden('Unauthorized to update patient programs');
    }

    const resolvedDosageType = resolveProgramDosageType({
      dosage_type,
      distance_feet,
      seconds_per_set,
      seconds_per_rep,
      fallback: existingProgram.dosage_type ?? 'reps',
    });

    const hasSecondsPerRep = seconds_per_rep !== undefined;
    const hasSecondsPerSet = seconds_per_set !== undefined;
    const updateData = {};

    if (sets !== undefined) {
      if (!Number.isInteger(sets) || sets < 1) return badRequest('sets must be a positive integer');
      updateData.sets = sets;
    }
    if (reps_per_set !== undefined) {
      if (reps_per_set === null) {
        if (dosageTypeRequiresReps(resolvedDosageType))
          return badRequest('reps_per_set must be a positive integer');
      } else if (!Number.isInteger(reps_per_set) || reps_per_set < 1) {
        return badRequest('reps_per_set must be a positive integer');
      } else {
        updateData.reps_per_set = reps_per_set;
      }
    }
    if (hasSecondsPerRep) {
      if (seconds_per_rep !== null && (!Number.isInteger(seconds_per_rep) || seconds_per_rep < 0))
        return badRequest('seconds_per_rep must be a non-negative integer or null');
      updateData.seconds_per_rep = seconds_per_rep;
    }
    if (hasSecondsPerSet) {
      if (seconds_per_set !== null && (!Number.isInteger(seconds_per_set) || seconds_per_set < 0))
        return badRequest('seconds_per_set must be a non-negative integer or null');
      updateData.seconds_per_set = seconds_per_set;
    }
    if (distance_feet !== undefined) {
      if (distance_feet !== null && (!Number.isInteger(distance_feet) || distance_feet < 1))
        return badRequest('distance_feet must be a positive integer or null');
      updateData.distance_feet = distance_feet;
    }
    if (dosage_type !== undefined) updateData.dosage_type = dosage_type;

    const metadata = normalizeProgramMetadataFields({
      assignment_status,
      effective_start_date,
      effective_end_date,
    });
    if (metadata.error) {
      return badRequest(metadata.error);
    }
    const mergedEffectiveStartDate =
      metadata.updates.effective_start_date !== undefined
        ? metadata.updates.effective_start_date
        : existingProgram.effective_start_date;
    const mergedEffectiveEndDate =
      metadata.updates.effective_end_date !== undefined
        ? metadata.updates.effective_end_date
        : existingProgram.effective_end_date;
    if (
      mergedEffectiveStartDate &&
      mergedEffectiveEndDate &&
      mergedEffectiveStartDate > mergedEffectiveEndDate
    ) {
      return badRequest('effective_start_date must be on or before effective_end_date');
    }
    Object.assign(updateData, metadata.updates);

    // Mutually exclusive seconds fields based on resolved dosage type
    if (hasSecondsPerRep && !hasSecondsPerSet) updateData.seconds_per_set = null;
    if (hasSecondsPerSet && !hasSecondsPerRep) updateData.seconds_per_rep = null;
    if (dosage_type === 'duration') updateData.seconds_per_rep = null;
    else if (dosage_type === 'hold') updateData.seconds_per_set = null;
    else if (dosage_type === 'reps' || dosage_type === 'distance') {
      updateData.seconds_per_rep = null;
      updateData.seconds_per_set = null;
    }

    const { data: program, error: dbError } = await supabase
      .from('patient_programs')
      .update(updateData)
      .eq('id', programId)
      .select()
      .single();

    if (dbError) throw dbError;

    return Response.json({ program });
  } catch (err) {
    console.error('Error updating program:', err);
    return serverError('Failed to update program', err);
  }
}

/**
 * DELETE /api/programs/:id — Archive a program (soft delete: sets archived_at).
 */
export async function DELETE(request, { params }) {
  const { user, accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  const { id: programId } = await params;
  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const { data: existingProgram, error: fetchError } = await supabase
      .from('patient_programs')
      .select('id, patient_id')
      .eq('id', programId)
      .single();

    if (fetchError || !existingProgram)
      return Response.json({ error: 'Program not found' }, { status: 404 });

    if (user.role === 'patient') {
      const isOwnAccount =
        user.id === existingProgram.patient_id || user.auth_id === existingProgram.patient_id;
      if (!isOwnAccount) return forbidden('Patients can only delete their own programs');
    } else if (user.role === 'therapist') {
      const { data: patient, error: patientError } = await supabase
        .from('users')
        .select('therapist_id')
        .eq('id', existingProgram.patient_id)
        .single();

      if (patientError) return serverError('Failed to verify patient relationship', patientError);
      if (!patient || patient.therapist_id !== user.id)
        return forbidden('Patient does not belong to this therapist');
    } else if (user.role !== 'admin') {
      return forbidden('Unauthorized to delete patient programs');
    }

    const { data: program, error: dbError } = await supabase
      .from('patient_programs')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', programId)
      .select()
      .single();

    if (dbError) throw dbError;

    return Response.json({ program });
  } catch (err) {
    console.error('Error deleting program:', err);
    return serverError('Failed to delete program', err);
  }
}
