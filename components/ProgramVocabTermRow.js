// components/ProgramVocabTermRow.js — per-term display, edit, and archive UI for the program vocabulary workspace
import destructiveButtonStyles from './DestructiveActionButton.module.css';
import styles from './ExerciseForm.module.css';

export default function ProgramVocabTermRow({
  term,
  isEditing,
  isReviewingArchive,
  editDefinition,
  onEditDefinitionChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onStartArchiveReview,
  onCancelArchiveReview,
  onConfirmArchive,
  saving,
}) {
  return (
    <div className={styles.vocabTermRow}>
      <div className={styles.vocabTermMeta}>
        <p className={styles.vocabCode}>{term.code}</p>
        {isEditing ? (
          <input
            className={styles.input}
            value={editDefinition}
            onChange={(event) => onEditDefinitionChange(event.target.value)}
          />
        ) : (
          <p className={styles.vocabDefinition}>{term.definition || '—'}</p>
        )}
        {isReviewingArchive ? (
          <div className={styles.archiveWarningBox}>
            <p className={styles.archiveWarningTitle}>Archive this vocabulary term?</p>
            <p className={styles.archiveWarningText}>
              This removes the term from active editor lists only. It does not permanently erase the
              term.
            </p>
            <div className={styles.inlineActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onPointerUp={onCancelArchiveReview}
                disabled={saving}
              >
                Keep term
              </button>
              <button
                type="button"
                className={destructiveButtonStyles.destructiveActionButton}
                onPointerUp={onConfirmArchive}
                disabled={saving}
              >
                Confirm archive
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className={styles.inlineActions}>
        {isEditing ? (
          <>
            <button
              type="button"
              className={styles.btnSecondary}
              onPointerUp={onSaveEdit}
              disabled={saving}
            >
              Save
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onPointerUp={onCancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.btnSecondary}
            onPointerUp={onStartEdit}
            disabled={saving}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className={destructiveButtonStyles.destructiveActionButton}
          onPointerUp={onStartArchiveReview}
          disabled={saving}
        >
          Archive…
        </button>
      </div>
    </div>
  );
}
