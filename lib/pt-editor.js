// pt-editor.js — exercise data access functions (pt-editor page only)

import { fetchJsonWithOffline } from './fetch-with-offline';

/**
 * Fetch all exercises with full related data (equipment, muscles, guidance, etc.).
 * @param {string} accessToken
 * @returns {Promise<Array>}
 */
export async function fetchExercises(accessToken) {
  const data = await fetchJsonWithOffline('/api/exercises', {
    token: accessToken,
    errorPrefix: 'Failed to load exercises',
    offlineMessage: 'Offline - exercises unavailable.',
  });
  return data.exercises;
}

/**
 * Fetch all active vocabulary terms, keyed by category.
 * Returns { region: [{code, definition, ...}], capacity: [...], ... }
 * @param {string} accessToken
 * @returns {Promise<Object>}
 */
export async function fetchVocabularies(accessToken) {
  const data = await fetchJsonWithOffline('/api/vocab', {
    token: accessToken,
    errorPrefix: 'Failed to load vocabularies',
    offlineMessage: 'Offline - vocabularies unavailable.',
  });
  return data.vocabularies;
}

/**
 * Add a new controlled vocabulary term.
 * @param {string} accessToken
 * @param {{ table: string, code: string, definition: string, sort_order?: number }} payload
 * @returns {Promise<Object>} { item }
 */
export async function createVocabularyTerm(accessToken, payload) {
  const res = await fetch('/api/vocab', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to add vocabulary term: ${res.status}`);
  }
  return res.json();
}

/**
 * Update an existing controlled vocabulary term.
 * @param {string} accessToken
 * @param {{ table: string, code: string, definition?: string, sort_order?: number, active?: boolean }} payload
 * @returns {Promise<Object>} { item }
 */
export async function updateVocabularyTerm(accessToken, payload) {
  const res = await fetch('/api/vocab', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update vocabulary term: ${res.status}`);
  }
  return res.json();
}

/**
 * Soft-delete a controlled vocabulary term.
 * @param {string} accessToken
 * @param {{ table: string, code: string }} payload
 * @returns {Promise<Object>}
 */
export async function deleteVocabularyTerm(accessToken, { table, code }) {
  const query = new URLSearchParams({ table, code });
  const res = await fetch(`/api/vocab?${query.toString()}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete vocabulary term: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch reference data: distinct equipment, muscle, and form parameter names in use.
 * Returns { equipment: [], muscles: [], formParameters: [] }
 * @param {string} accessToken
 * @returns {Promise<Object>}
 */
export async function fetchReferenceData(accessToken) {
  return fetchJsonWithOffline('/api/reference-data', {
    token: accessToken,
    errorPrefix: 'Failed to load reference data',
    offlineMessage: 'Offline - reference data unavailable.',
  });
}

/**
 * Create a new exercise. Payload shape matches the exercises API POST contract.
 * @param {string} accessToken
 * @param {Object} exercise
 * @returns {Promise<Object>} { exercise: rawRow }
 */
export async function createExercise(accessToken, exercise) {
  const res = await fetch('/api/exercises', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(exercise),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create exercise: ${res.status}`);
  }
  return res.json();
}

/**
 * Update an existing exercise by ID. Sends only the fields that changed.
 * @param {string} accessToken
 * @param {string} exerciseId
 * @param {Object} exercise
 * @returns {Promise<Object>} { exercise: rawRow }
 */
export async function updateExercise(accessToken, exerciseId, exercise) {
  const res = await fetch(`/api/exercises/${encodeURIComponent(exerciseId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(exercise),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update exercise: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch role assignments for a specific exercise.
 * @param {string} accessToken
 * @param {string} exerciseId
 * @returns {Promise<Array>}
 */
export async function fetchRoles(accessToken, exerciseId) {
  const data = await fetchJsonWithOffline(
    `/api/roles?exercise_id=${encodeURIComponent(exerciseId)}`,
    {
      token: accessToken,
      errorPrefix: 'Failed to load roles',
      offlineMessage: 'Offline - roles unavailable.',
    },
  );
  return data.roles;
}

/**
 * Create a new role assignment for an exercise.
 * @param {string} accessToken
 * @param {{ exercise_id, region, capacity, focus, contribution }} roleData
 * @returns {Promise<Object>} { role }
 */
export async function addRole(accessToken, roleData) {
  const res = await fetch('/api/roles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(roleData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to add role: ${res.status}`);
  }
  return res.json();
}

/**
 * Soft-delete a role assignment (sets active=false).
 * @param {string} accessToken
 * @param {string} roleId
 * @returns {Promise<void>}
 */
export async function deleteRole(accessToken, roleId) {
  const res = await fetch(`/api/roles?id=${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete role: ${res.status}`);
  }
}

/**
 * Fetch all active program assignments for a patient, keyed by exercise_id.
 * @param {string} accessToken
 * @param {string} patientId
 * @returns {Promise<Object>} programs keyed by exercise_id for O(1) lookup
 */
export async function fetchPrograms(accessToken, patientId) {
  const data = await fetchJsonWithOffline(
    `/api/programs?patient_id=${encodeURIComponent(patientId)}`,
    {
      token: accessToken,
      errorPrefix: 'Failed to load programs',
      offlineMessage: 'Offline - programs unavailable.',
    },
  );
  return Object.fromEntries((data.programs ?? []).map((p) => [p.exercise_id, p]));
}

/**
 * Assign a dosage to an exercise for a patient (create program record).
 * @param {string} accessToken
 * @param {{ patient_id, exercise_id, sets, reps_per_set, seconds_per_rep, distance_feet }} data
 * @returns {Promise<Object>} { program }
 */
export async function createProgram(accessToken, data) {
  const res = await fetch('/api/programs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create program: ${res.status}`);
  }
  return res.json();
}

/**
 * Update a patient program's dosage.
 * @param {string} accessToken
 * @param {string} programId
 * @param {{ sets, reps_per_set, seconds_per_rep, distance_feet }} updates
 * @returns {Promise<Object>} { program }
 */
export async function updateProgram(accessToken, programId, updates) {
  const res = await fetch(`/api/programs/${encodeURIComponent(programId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update program: ${res.status}`);
  }
  return res.json();
}

/**
 * Batch-assign programs for a patient.
 * @param {string} accessToken
 * @param {{ patient_id: string, assignments: Array<Object> }} payload
 * @returns {Promise<Object>} { programs, count }
 */
export async function batchAssignPrograms(accessToken, payload) {
  const res = await fetch('/api/programs/batch/assign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to batch assign programs: ${res.status}`);
  }
  return res.json();
}

/**
 * Batch-update assignment status for patient programs.
 * @param {string} accessToken
 * @param {{ patient_id: string, program_ids: string[], assignment_status: string }} payload
 * @returns {Promise<Object>} { programs, count }
 */
export async function batchUpdateProgramStatus(accessToken, payload) {
  const res = await fetch('/api/programs/batch/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to batch update program status: ${res.status}`);
  }
  return res.json();
}

/**
 * Batch-update effective dates for patient programs.
 * @param {string} accessToken
 * @param {{ patient_id: string, program_ids: string[], effective_start_date?: string | null, effective_end_date?: string | null }} payload
 * @returns {Promise<Object>} { programs, count }
 */
export async function batchUpdateProgramDates(accessToken, payload) {
  const res = await fetch('/api/programs/batch/dates', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to batch update program dates: ${res.status}`);
  }
  return res.json();
}

/**
 * Generate a slug-based exercise ID from a canonical name.
 * Matches the legacy pt_editor.js pattern: lowercase, underscores, trimmed.
 * @param {string} name
 * @returns {string}
 */
export function generateExerciseId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
