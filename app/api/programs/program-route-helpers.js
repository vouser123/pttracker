// app/api/programs/program-route-helpers.js — shared auth and field validation helpers for program routes.

import { getSupabaseAdmin, getSupabaseWithAuth } from '../../../lib/db.js';
import { forbidden } from '../../../lib/route-auth.js';

// Intentionally hardcoded DB-backed status enum; approved in bead pt-2ke7h on 2026-04-14.
// Do not extend without explicit sign-off. These values match the patient_programs constraint.
const PROGRAM_ASSIGNMENT_STATUS_VALUES = new Set(['active', 'inactive', 'on_hold', 'as_needed']);

function isDateOnlyString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidDateOnlyString(value) {
  if (!isDateOnlyString(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Resolve a patient identifier that may be either users.id or auth.users.id.
 * Returns { actualPatientId, patientRecord, source }.
 */
export async function resolvePatientId(user, patientId) {
  if (!patientId) {
    return { actualPatientId: null, patientRecord: null, source: 'missing' };
  }

  if (patientId === user.id) {
    return { actualPatientId: user.id, patientRecord: user, source: 'users.id' };
  }

  if (patientId === user.auth_id) {
    return { actualPatientId: user.id, patientRecord: user, source: 'auth_id:self' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: userById } = await supabaseAdmin
    .from('users')
    .select('id, auth_id, therapist_id')
    .eq('id', patientId)
    .maybeSingle();

  if (userById) {
    return { actualPatientId: userById.id, patientRecord: userById, source: 'users.id' };
  }

  const { data: userByAuthId } = await supabaseAdmin
    .from('users')
    .select('id, auth_id, therapist_id')
    .eq('auth_id', patientId)
    .maybeSingle();

  if (userByAuthId) {
    return {
      actualPatientId: userByAuthId.id,
      patientRecord: userByAuthId,
      source: 'auth_id:lookup',
    };
  }

  return { actualPatientId: null, patientRecord: null, source: 'not_found' };
}

/**
 * Validate that the authenticated user can manage programs for the target patient.
 * Returns a Response on failure, otherwise null.
 */
export async function verifyProgramPatientAccess({
  user,
  accessToken,
  patientId,
  patientRecord = null,
  allowPatient = false,
}) {
  const isOwnAccount = user.id === patientId;

  if (user.role === 'patient') {
    if (!allowPatient || !isOwnAccount) {
      return forbidden('Patients cannot manage these patient programs');
    }
    return null;
  }

  if (user.role === 'therapist') {
    const supabase = getSupabaseWithAuth(accessToken);
    const patientLookup = patientRecord?.id
      ? { data: patientRecord, error: null }
      : await supabase.from('users').select('therapist_id').eq('id', patientId).single();
    const { data: patient, error: patientError } = patientLookup;

    if (patientError) {
      throw patientError;
    }

    if (!patient || patient.therapist_id !== user.id) {
      return forbidden('Patient does not belong to this therapist');
    }

    return null;
  }

  if (user.role !== 'admin') {
    return forbidden('Unauthorized to manage patient programs');
  }

  return null;
}

/**
 * Normalize optional assignment metadata fields for program writes.
 * Returns { updates } on success or { error } on validation failure.
 */
export function normalizeProgramMetadataFields(
  { assignment_status, effective_start_date, effective_end_date },
  { requireAtLeastOne = false } = {},
) {
  const updates = {};

  if (assignment_status !== undefined) {
    if (
      typeof assignment_status !== 'string' ||
      !PROGRAM_ASSIGNMENT_STATUS_VALUES.has(assignment_status)
    ) {
      return {
        error: 'assignment_status must be one of: active, inactive, on_hold, as_needed',
      };
    }
    updates.assignment_status = assignment_status;
  }

  if (effective_start_date !== undefined) {
    if (effective_start_date !== null && !isValidDateOnlyString(effective_start_date)) {
      return { error: 'effective_start_date must be a valid YYYY-MM-DD date or null' };
    }
    updates.effective_start_date = effective_start_date;
  }

  if (effective_end_date !== undefined) {
    if (effective_end_date !== null && !isValidDateOnlyString(effective_end_date)) {
      return { error: 'effective_end_date must be a valid YYYY-MM-DD date or null' };
    }
    updates.effective_end_date = effective_end_date;
  }

  if (
    updates.effective_start_date &&
    updates.effective_end_date &&
    updates.effective_start_date > updates.effective_end_date
  ) {
    return { error: 'effective_start_date must be on or before effective_end_date' };
  }

  if (requireAtLeastOne && Object.keys(updates).length === 0) {
    return { error: 'At least one assignment field is required' };
  }

  return { updates };
}
