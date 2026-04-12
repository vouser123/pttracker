// components/ProgramVocabAddTermForm.js — add-term form for the program vocabulary workspace
import styles from './ExerciseForm.module.css';

export default function ProgramVocabAddTermForm({
  fieldIds,
  newCode,
  newDefinition,
  onCodeChange,
  onCodeBlur,
  onDefinitionChange,
  onAddTerm,
  saving,
}) {
  return (
    <div className={styles.vocabManager}>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.fieldLabel} htmlFor={fieldIds.code}>
            Code
          </label>
          <input
            id={fieldIds.code}
            className={styles.input}
            value={newCode}
            onChange={(event) => onCodeChange(event.target.value)}
            onBlur={(event) => onCodeBlur(event.target.value)}
            placeholder="lowercase_code"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.fieldLabel} htmlFor={fieldIds.definition}>
            Definition
          </label>
          <input
            id={fieldIds.definition}
            className={styles.input}
            value={newDefinition}
            onChange={(event) => onDefinitionChange(event.target.value)}
            placeholder="Human-readable meaning"
          />
        </div>
      </div>
      <div className={styles.inlineActions}>
        <span className={styles.hint}>
          Codes are stored as lowercase values. Definitions provide the readable label.
        </span>
        <button
          type="button"
          className={styles.btnSecondary}
          onPointerUp={onAddTerm}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Add Vocabulary Term'}
        </button>
      </div>
    </div>
  );
}
