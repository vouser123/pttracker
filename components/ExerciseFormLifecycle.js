// ExerciseFormLifecycle.js — exercise form section 6: lifecycle, status, and supersedes relationship

import styles from './ExerciseForm.module.css';
import NativeSelect from './NativeSelect';

// Intentionally hardcoded behavior enum; approved by user on 2026-04-07.
// Do not extend without explicit sign-off. These values drive lifecycle behavior.
const LIFECYCLE_STATUSES = ['active', 'on_hold', 'as_needed', 'archived', 'deprecated'];

function toTitleCase(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export default function ExerciseFormLifecycle({
  lifecycle,
  onLifecycleChange,
  supersedes,
  onSupersedingChange,
  exercises,
  currentExerciseId,
}) {
  const fieldIds = {
    status: 'exercise-lifecycle-status',
    effectiveStart: 'exercise-lifecycle-effective-start',
    effectiveEnd: 'exercise-lifecycle-effective-end',
    supersedes: 'exercise-lifecycle-supersedes',
  };
  const supersededByExercise = lifecycle.superseded_by
    ? exercises.find((ex) => ex.id === lifecycle.superseded_by)
    : null;
  const supersedableExercises = (exercises ?? []).filter((ex) => ex.id !== currentExerciseId);

  return (
    <details className={styles.section}>
      <summary className={styles.sectionHeader}>Lifecycle &amp; Status</summary>
      <div className={styles.sectionContent}>
        <div className={styles.formGroup}>
          <label className={styles.fieldLabel} htmlFor={fieldIds.status}>
            Status
          </label>
          <NativeSelect
            id={fieldIds.status}
            className={styles.select}
            value={lifecycle.status ?? ''}
            onChange={(value) => onLifecycleChange({ ...lifecycle, status: value || null })}
            placeholder="None"
            options={LIFECYCLE_STATUSES.map((status) => ({
              value: status,
              label: toTitleCase(status.replace(/_/g, ' ')),
            }))}
          />
          <span className={styles.hint}>
            <strong>active</strong> — in use.&nbsp;
            <strong>on hold</strong> — paused for now, but still shown in program so it can return
            to rotation later.&nbsp;
            <strong>as needed</strong> — available to log and manage, but excluded from routine
            counts and needs-attention surfaces.&nbsp;
            <strong>archived</strong> — temporarily set aside; appears when "Show archived" is
            on.&nbsp;
            <strong>deprecated</strong> — permanently removed from use; never appears in the
            exercise list.
          </span>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.effectiveStart}>
              Effective Start
            </label>
            <input
              id={fieldIds.effectiveStart}
              type="date"
              className={styles.input}
              value={lifecycle.effective_start_date ?? ''}
              onChange={(e) =>
                onLifecycleChange({ ...lifecycle, effective_start_date: e.target.value || null })
              }
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.effectiveEnd}>
              Effective End
            </label>
            <input
              id={fieldIds.effectiveEnd}
              type="date"
              className={styles.input}
              value={lifecycle.effective_end_date ?? ''}
              onChange={(e) =>
                onLifecycleChange({ ...lifecycle, effective_end_date: e.target.value || null })
              }
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel} htmlFor={fieldIds.supersedes}>
            Supersedes
          </label>
          <NativeSelect
            id={fieldIds.supersedes}
            className={styles.select}
            value={supersedes ?? ''}
            onChange={(value) => onSupersedingChange(value || null)}
            placeholder="None"
            options={supersedableExercises.map((ex) => ({
              value: ex.id,
              label: ex.canonical_name,
            }))}
          />
          <span className={styles.hint}>
            This exercise replaces the selected exercise. Saving updates the superseded exercise
            automatically.
          </span>
        </div>

        <div className={styles.formGroup}>
          <p className={styles.fieldLabel}>Superseded by</p>
          {lifecycle.superseded_by ? (
            <>
              <p className={styles.readonlyDate}>
                {supersededByExercise
                  ? supersededByExercise.canonical_name
                  : lifecycle.superseded_by}
                {lifecycle.superseded_date ? ` (${lifecycle.superseded_date.split('T')[0]})` : ''}
              </p>
              <span className={styles.hint}>
                Set automatically when another exercise supersedes this one.
              </span>
            </>
          ) : (
            <p className={styles.readonlyDate}>—</p>
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <p className={styles.fieldLabel}>Added Date</p>
            <p className={styles.readonlyDate}>
              {lifecycle.added_date ? lifecycle.added_date.split('T')[0] : '—'}
            </p>
          </div>
          <div className={styles.formGroup}>
            <p className={styles.fieldLabel}>Last Updated</p>
            <p className={styles.readonlyDate}>
              {lifecycle.updated_date ? lifecycle.updated_date.split('T')[0] : '—'}
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}
