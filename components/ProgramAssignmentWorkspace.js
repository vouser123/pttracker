// components/ProgramAssignmentWorkspace.js — batch assignment workspace for /program
import { useState } from 'react';
import styles from './ProgramAssignmentWorkspace.module.css';

const BADGE_LABELS = {
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  archived: 'Archived',
  deprecated: 'Deprecated',
};

/**
 * Batch assignment workspace. Pure UI — no lib or hook imports.
 * Selection state and domain transforms are owned by the caller.
 *
 * @param {{
 *   exerciseRows: Array<{ exercise, program, badgeState, isSelectable, isAssigned }>,
 *   statusOptions: Array<{ value: string, label: string }>,
 *   patientName: string,
 *   selectedExerciseIds: Set<string>,
 *   onToggleExercise: (id: string) => void,
 *   onSelectAll: (ids: string[]) => void,
 *   onClearAll: () => void,
 *   onBatchAssign: (assignments: object[]) => void,
 *   onBatchStatusUpdate: (programIds: string[], status: string) => void,
 *   onBatchDateUpdate: (programIds: string[], updates: object) => void,
 * }} props
 */
export default function ProgramAssignmentWorkspace({
  exerciseRows = [],
  statusOptions = [],
  patientName = '',
  selectedExerciseIds = new Set(),
  onToggleExercise,
  onSelectAll,
  onClearAll,
  onBatchAssign,
  onBatchStatusUpdate,
  onBatchDateUpdate,
}) {
  const [pendingStatus, setPendingStatus] = useState('');
  const [pendingStartDate, setPendingStartDate] = useState('');
  const [pendingEndDate, setPendingEndDate] = useState('');

  const selectableIds = exerciseRows.filter((r) => r.isSelectable).map((r) => r.exercise.id);
  const isAllSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedExerciseIds.has(id));

  function handleSelectAll() {
    isAllSelected ? onClearAll?.() : onSelectAll?.(selectableIds);
  }

  const selectedRows = exerciseRows.filter((r) => selectedExerciseIds.has(r.exercise.id));
  const selectedUnassigned = selectedRows.filter((r) => !r.isAssigned);
  const selectedAssigned = selectedRows.filter((r) => r.isAssigned);
  const hasSelection = selectedRows.length > 0;

  function handleApply() {
    if (selectedUnassigned.length > 0) {
      onBatchAssign?.(
        selectedUnassigned.map((r) => ({
          exercise_id: r.exercise.id,
          assignment_status: 'active',
        })),
      );
    }
    if (selectedAssigned.length > 0) {
      const programIds = selectedAssigned.map((r) => r.program.id);
      if (pendingStatus) onBatchStatusUpdate?.(programIds, pendingStatus);
      if (pendingStartDate || pendingEndDate) {
        const updates = {};
        if (pendingStartDate) updates.effective_start_date = pendingStartDate;
        if (pendingEndDate) updates.effective_end_date = pendingEndDate;
        onBatchDateUpdate?.(programIds, updates);
      }
    }
    onClearAll?.();
    setPendingStatus('');
    setPendingStartDate('');
    setPendingEndDate('');
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Assign Exercises</h2>
      {patientName && (
        <p className={styles.patientLabel}>
          Patient: <strong>{patientName}</strong>
        </p>
      )}

      <div className={styles.selectAllRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleSelectAll}
            disabled={selectableIds.length === 0}
          />
          Select all ({selectableIds.length})
        </label>
        {hasSelection && (
          <span className={styles.selectionCount}>{selectedRows.length} selected</span>
        )}
      </div>

      <ul className={styles.exerciseList}>
        {exerciseRows.map(({ exercise, badgeState, isSelectable }) => (
          <li key={exercise.id} className={styles.exerciseRow}>
            <label className={`${styles.checkboxLabel} ${!isSelectable ? styles.disabled : ''}`}>
              <input
                type="checkbox"
                checked={selectedExerciseIds.has(exercise.id)}
                onChange={() => onToggleExercise?.(exercise.id)}
                disabled={!isSelectable}
              />
              <span className={styles.exerciseName}>{exercise.canonical_name}</span>
            </label>
            <span className={`${styles.statusBadge} ${styles[`status_${badgeState}`]}`}>
              {BADGE_LABELS[badgeState] ?? badgeState}
            </span>
          </li>
        ))}
        {exerciseRows.length === 0 && (
          <li className={styles.emptyState}>No exercises available.</li>
        )}
      </ul>

      {hasSelection && (
        <div className={styles.bulkPanel}>
          {selectedUnassigned.length > 0 && (
            <p className={styles.panelNote}>
              {selectedUnassigned.length} unassigned exercise
              {selectedUnassigned.length !== 1 ? 's' : ''} will be assigned as Active.
            </p>
          )}
          {selectedAssigned.length > 0 && (
            <div className={styles.editControls}>
              <label className={styles.fieldLabel}>
                Status
                <select
                  className={styles.statusSelect}
                  value={pendingStatus}
                  onChange={(e) => setPendingStatus(e.target.value)}
                >
                  <option value="">— no change —</option>
                  {statusOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldLabel}>
                Start date
                <input
                  type="date"
                  className={styles.dateInput}
                  value={pendingStartDate}
                  onChange={(e) => setPendingStartDate(e.target.value)}
                />
              </label>
              <label className={styles.fieldLabel}>
                End date
                <input
                  type="date"
                  className={styles.dateInput}
                  value={pendingEndDate}
                  onChange={(e) => setPendingEndDate(e.target.value)}
                />
              </label>
            </div>
          )}
          <button
            type="button"
            className={styles.applyBtn}
            disabled={!hasSelection}
            onPointerUp={handleApply}
          >
            Apply
          </button>
        </div>
      )}
    </section>
  );
}
