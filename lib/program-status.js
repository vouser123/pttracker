// lib/program-status.js — pure patient assignment status helpers (no I/O, no global exercise lifecycle)

// Global exercise statuses that override patient assignment_status at read time.
// When the exercise library marks something archived or deprecated, patient-level
// status cannot override it — this is the "hard floor" enforced by resolveEffectiveStatus.
const FLOOR_STATUSES = new Set(['archived', 'deprecated']);

// Keyed object for referencing status values without raw strings at call sites.
export const ASSIGNMENT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_HOLD: 'on_hold',
  AS_NEEDED: 'as_needed',
};

// Ordered array of valid patient_programs.assignment_status values.
export const VALID_ASSIGNMENT_STATUSES = ['active', 'inactive', 'on_hold', 'as_needed'];

// Human-readable display labels for each assignment status.
export const ASSIGNMENT_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  on_hold: 'On Hold',
  as_needed: 'As Needed (PRN)',
};

/**
 * Resolve the effective display/filter status for a patient program row.
 *
 * Hard floor: if the global exercise library status is 'archived' or 'deprecated',
 * that takes precedence regardless of what the patient assignment_status says.
 * Going forward, global archived/deprecated and patient inactive are distinct concepts:
 * - Global: exercise is retired from the library
 * - Patient inactive: exercise was stopped for this patient specifically
 *
 * @param {string|null|undefined} globalStatus     — exercises.lifecycle_status
 * @param {string|null|undefined} assignmentStatus — patient_programs.assignment_status
 * @returns {string}
 */
export function resolveEffectiveStatus(globalStatus, assignmentStatus) {
  if (FLOOR_STATUSES.has(globalStatus)) return globalStatus;
  return VALID_ASSIGNMENT_STATUSES.includes(assignmentStatus) ? assignmentStatus : 'active';
}

/**
 * Returns true if the exercise's global lifecycle status allows the patient-scoped
 * assignment_status to be edited or set. Archived and deprecated exercises are
 * floor-locked — no patient assignment change can override them.
 *
 * @param {string|null|undefined} globalStatus — exercises.lifecycle_status
 * @returns {boolean}
 */
export function isAssignmentStatusAllowed(globalStatus) {
  return !FLOOR_STATUSES.has(globalStatus);
}

/**
 * Enrich raw exercises + programs map into display rows for ProgramAssignmentWorkspace.
 * Pure transform — no I/O, no React.
 *
 * badgeState: 'assigned' | 'unassigned' | 'archived' | 'deprecated'
 *
 * @param {object[]} exercises
 * @param {Record<string, object>} programs  — keyed by exercise_id
 * @returns {Array<{ exercise, program, badgeState, isSelectable, isAssigned }>}
 */
export function enrichExerciseAssignmentRows(exercises = [], programs = {}) {
  return exercises.map((exercise) => {
    const program = programs[exercise.id] ?? null;
    const isSelectable = isAssignmentStatusAllowed(exercise.lifecycle_status);
    const isAssigned = program !== null && isSelectable;
    const badgeState = !isSelectable
      ? exercise.lifecycle_status
      : isAssigned
        ? 'assigned'
        : 'unassigned';
    return { exercise, program, badgeState, isSelectable, isAssigned };
  });
}

/**
 * Build the status dropdown options array for the bulk-edit panel.
 * @returns {Array<{ value: string, label: string }>}
 */
export function buildAssignmentStatusOptions() {
  return VALID_ASSIGNMENT_STATUSES.map((s) => ({ value: s, label: ASSIGNMENT_STATUS_LABELS[s] }));
}
