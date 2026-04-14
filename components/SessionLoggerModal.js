// components/SessionLoggerModal.js — session logger modal shell for manual and edit flows
import { useEffect, useState } from 'react';
import styles from './SessionLoggerModal.module.css';
import SessionLoggerSetCard from './SessionLoggerSetCard';

function shouldShowSeconds(exercise) {
  const modifiers = exercise?.pattern_modifiers ?? [];
  return (
    modifiers.includes('hold_seconds') ||
    modifiers.includes('duration_seconds') ||
    exercise?.dosage_type === 'hold' ||
    exercise?.dosage_type === 'duration'
  );
}

function shouldShowDistance(exercise) {
  const modifiers = exercise?.pattern_modifiers ?? [];
  return modifiers.includes('distance_feet') || exercise?.dosage_type === 'distance';
}

function shouldShowReps(exercise) {
  const modifiers = exercise?.pattern_modifiers ?? [];
  const isDuration = modifiers.includes('duration_seconds') || exercise?.dosage_type === 'duration';
  const isDistance = modifiers.includes('distance_feet') || exercise?.dosage_type === 'distance';
  return !isDuration && !isDistance;
}

function getSecondsLabel(exercise) {
  const modifiers = exercise?.pattern_modifiers ?? [];
  const dosageType = exercise?.dosage_type ?? null;
  if (modifiers.includes('duration_seconds') || dosageType === 'duration')
    return 'Seconds performed';
  if (modifiers.includes('hold_seconds') || dosageType === 'hold') return 'Seconds per rep';
  return 'Seconds';
}

function toLocalDateTimeInputValue(isoValue) {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function SessionLoggerModal({
  isOpen,
  isEdit,
  exercise,
  title = null,
  submitLabel = null,
  showPerformedAt = true,
  showNotes = true,
  performedAt,
  notes,
  sets,
  submitting,
  error,
  onClose,
  onPerformedAtChange,
  onNotesChange,
  onAddSet,
  onRemoveSet,
  onSetChange,
  onFormParamChange,
  onSubmit,
  historicalFormParams = {},
  formParameterMetadata = {},
}) {
  const [customModes, setCustomModes] = useState({});

  useEffect(() => {
    if (!isOpen) setCustomModes({});
  }, [isOpen]);

  if (!isOpen || !exercise) return null;

  const formParams = exercise.form_parameters_required ?? [];
  const showReps = shouldShowReps(exercise);
  const showSeconds = shouldShowSeconds(exercise);
  const showDistance = shouldShowDistance(exercise);
  const isSided = exercise.pattern === 'side';
  const secondsLabel = getSecondsLabel(exercise);
  const fieldIds = {
    performedAt: 'session-logger-performed-at',
    notes: 'session-logger-notes',
  };

  function setCustomMode(setIndex, paramName, isCustom) {
    const key = `${setIndex}:${paramName}`;
    setCustomModes((prev) => ({ ...prev, [key]: isCustom }));
  }

  return (
    <div
      className={styles.overlay}
      onPointerUp={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={styles.modal} aria-label="Session logger">
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>{title ?? (isEdit ? 'Edit Session' : 'Log Session')}</h2>
            <p className={styles.subtitle}>{exercise.canonical_name}</p>
          </div>
          <button
            className={styles.closeBtn}
            onPointerUp={onClose}
            type="button"
            aria-label="Close"
          >
            Close
          </button>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        {showPerformedAt && (
          <div className={styles.metaRow}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.performedAt}>
              Performed At
            </label>
            <input
              id={fieldIds.performedAt}
              className={styles.input}
              type="datetime-local"
              value={toLocalDateTimeInputValue(performedAt)}
              onChange={(event) => {
                if (!event.target.value) return;
                onPerformedAtChange(new Date(event.target.value).toISOString());
              }}
            />
          </div>
        )}

        <div className={styles.setList}>
          {sets.map((set, index) => (
            <SessionLoggerSetCard
              key={set.set_number ?? `set-${String(index + 1)}`}
              index={index}
              set={set}
              totalSets={sets.length}
              showReps={showReps}
              showSeconds={showSeconds}
              showDistance={showDistance}
              isSided={isSided}
              secondsLabel={secondsLabel}
              formParams={formParams}
              historicalFormParams={historicalFormParams}
              formParameterMetadata={formParameterMetadata}
              customModes={customModes}
              onSetCustomMode={setCustomMode}
              onRemoveSet={onRemoveSet}
              onSetChange={onSetChange}
              onFormParamChange={onFormParamChange}
            />
          ))}
        </div>

        {showNotes && (
          <>
            <label className={styles.fieldLabel} htmlFor={fieldIds.notes}>
              Notes
            </label>
            <textarea
              id={fieldIds.notes}
              className={styles.textarea}
              rows={3}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Optional notes"
            />
          </>
        )}

        <footer className={styles.footer}>
          <button className={styles.secondaryBtn} onPointerUp={onAddSet} type="button">
            Add Set
          </button>
          <button
            className={styles.primaryBtn}
            onPointerUp={onSubmit}
            type="button"
            disabled={submitting}
          >
            {submitting
              ? 'Saving...'
              : (submitLabel ?? (isEdit ? 'Save Changes' : 'Finish Session'))}
          </button>
        </footer>
      </section>
    </div>
  );
}
