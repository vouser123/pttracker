// lib/program-status-display.js — display adapters for patient assignment status (labels, options, row enrichment)
import { isAssignmentStatusAllowed, VALID_ASSIGNMENT_STATUSES } from './program-status.js';

// Human-readable display labels for each assignment status.
export const ASSIGNMENT_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  on_hold: 'On Hold',
  as_needed: 'As Needed (PRN)',
};

// Display labels for all possible badgeState values (assignment statuses + lifecycle overrides).
export const BADGE_STATE_LABELS = {
  active: 'Active',
  as_needed: 'As Needed',
  on_hold: 'On Hold',
  inactive: 'Inactive',
  unassigned: 'Unassigned',
  archived: 'Archived',
  deprecated: 'Deprecated',
};

// Canonical display order for exercise status groups.
export const STATUS_GROUP_ORDER = [
  'active',
  'as_needed',
  'on_hold',
  'inactive',
  'unassigned',
  'archived',
  'deprecated',
];

/**
 * Enrich raw exercises + programs map into display rows for ProgramAssignmentWorkspace.
 * Pure transform — no I/O, no React.
 *
 * badgeState: assignment_status ('active'|'as_needed'|'on_hold'|'inactive') | 'unassigned' | 'archived' | 'deprecated'
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
        ? (program.assignment_status ?? 'active')
        : 'unassigned';
    return { exercise, program, badgeState, isSelectable, isAssigned };
  });
}

/**
 * Group and sort exercise rows for display in ProgramAssignmentWorkspace.
 * - Alphabetically sorted by canonical_name within each group
 * - Groups ordered by STATUS_GROUP_ORDER
 *
 * @param {Array<{ exercise, program, badgeState, isSelectable, isAssigned }>} rows
 * @returns {Array<{ status: string, label: string, rows: Array }>}
 */
export function groupAndSortExerciseRows(rows) {
  const sorted = [...rows].sort((a, b) =>
    (a.exercise.canonical_name ?? '').localeCompare(b.exercise.canonical_name ?? ''),
  );
  const buckets = Object.fromEntries(STATUS_GROUP_ORDER.map((s) => [s, []]));
  for (const row of sorted) {
    if (Object.hasOwn(buckets, row.badgeState)) {
      buckets[row.badgeState].push(row);
    }
  }
  return STATUS_GROUP_ORDER.map((status) => ({
    status,
    label: BADGE_STATE_LABELS[status],
    rows: buckets[status],
  })).filter((g) => g.rows.length > 0);
}

/**
 * Build the status dropdown options array for the bulk-edit panel.
 * @returns {Array<{ value: string, label: string }>}
 */
export function buildAssignmentStatusOptions() {
  return VALID_ASSIGNMENT_STATUSES.map((s) => ({ value: s, label: ASSIGNMENT_STATUS_LABELS[s] }));
}
