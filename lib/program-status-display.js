// lib/program-status-display.js — display adapters for patient assignment status (labels, options, row enrichment)
import { isAssignmentStatusAllowed, VALID_ASSIGNMENT_STATUSES } from './program-status.js';

// Human-readable display labels for each assignment status.
export const ASSIGNMENT_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  on_hold: 'On Hold',
  as_needed: 'As Needed (PRN)',
};

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
