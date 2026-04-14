// app/api/programs/batch/dates/route.js — batch-update patient program effective dates.

import { getSupabaseWithAuth } from '../../../../../lib/db.js';
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

/**
 * PATCH /api/programs/batch/dates — Batch-update effective dates for patient programs.
 * Body: { patient_id, program_ids: string[], effective_start_date?, effective_end_date? }
 */
export async function PATCH(request) {
  const { user, accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { patient_id, program_ids, effective_start_date, effective_end_date } = body ?? {};

  if (!patient_id) {
    return badRequest('patient_id is required');
  }

  if (!Array.isArray(program_ids) || program_ids.length === 0) {
    return badRequest('program_ids must be a non-empty array');
  }

  if (new Set(program_ids).size !== program_ids.length) {
    return badRequest('program_ids cannot contain duplicates');
  }

  const metadata = normalizeProgramMetadataFields(
    { effective_start_date, effective_end_date },
    { requireAtLeastOne: true },
  );
  if (metadata.error) {
    return badRequest(metadata.error);
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

    const supabase = getSupabaseWithAuth(accessToken);

    const { data: ownedPrograms, error: ownedProgramsError } = await supabase
      .from('patient_programs')
      .select('id, effective_start_date, effective_end_date')
      .eq('patient_id', actualPatientId)
      .is('archived_at', null)
      .in('id', program_ids);

    if (ownedProgramsError) throw ownedProgramsError;

    if ((ownedPrograms ?? []).length !== program_ids.length) {
      return Response.json(
        { error: 'One or more program_ids do not belong to this patient' },
        { status: 404 },
      );
    }

    const hasInvalidRange = (ownedPrograms ?? []).some((program) => {
      const nextStartDate =
        metadata.updates.effective_start_date !== undefined
          ? metadata.updates.effective_start_date
          : program.effective_start_date;
      const nextEndDate =
        metadata.updates.effective_end_date !== undefined
          ? metadata.updates.effective_end_date
          : program.effective_end_date;
      return Boolean(nextStartDate && nextEndDate && nextStartDate > nextEndDate);
    });
    if (hasInvalidRange) {
      return badRequest('effective_start_date must be on or before effective_end_date');
    }

    const { data: programs, error: updateError } = await supabase
      .from('patient_programs')
      .update(metadata.updates)
      .eq('patient_id', actualPatientId)
      .in('id', program_ids)
      .select();

    if (updateError) throw updateError;

    return Response.json({ programs: programs ?? [], count: programs?.length ?? 0 });
  } catch (err) {
    console.error('Error batch updating program dates:', err);
    return serverError('Failed to batch update program dates', err);
  }
}
