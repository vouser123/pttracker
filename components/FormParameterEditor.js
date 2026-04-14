// components/FormParameterEditor.js — editor for form parameter display metadata (suffix, unit options).
import { useState } from 'react';
import destructiveButtonStyles from './DestructiveActionButton.module.css';
import styles from './FormParameterEditor.module.css';

function parseUnitOptions(value) {
  if (!value?.trim()) return null;
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}

function formatUnitOptions(unit_options) {
  if (!Array.isArray(unit_options) || unit_options.length === 0) return '';
  return unit_options.join(', ');
}

export default function FormParameterEditor({
  items = [],
  onAdd,
  onUpdate,
  onDelete,
  saving = false,
}) {
  const [newName, setNewName] = useState('');
  const [newSuffix, setNewSuffix] = useState('');
  const [newUnits, setNewUnits] = useState('');
  const [editName, setEditName] = useState(null);
  const [editSuffix, setEditSuffix] = useState('');
  const [editUnits, setEditUnits] = useState('');
  const [archiveReviewName, setArchiveReviewName] = useState(null);
  const [formError, setFormError] = useState(null);

  function handleStartEdit(item) {
    setEditName(item.parameter_name);
    setEditSuffix(item.display_suffix ?? '');
    setEditUnits(formatUnitOptions(item.unit_options));
    setArchiveReviewName(null);
  }

  function handleCancelEdit() {
    setEditName(null);
    setEditSuffix('');
    setEditUnits('');
  }

  async function handleSaveEdit() {
    setFormError(null);
    await onUpdate({
      parameter_name: editName,
      display_suffix: editSuffix.trim() || null,
      unit_options: parseUnitOptions(editUnits),
    });
    handleCancelEdit();
  }

  async function handleConfirmArchive(name) {
    const confirmed = window.confirm(
      `Archive "${name}" from active form parameters? It will no longer appear in the editor, but existing logged values are not affected.`,
    );
    if (!confirmed) return;
    setArchiveReviewName(null);
    if (editName === name) handleCancelEdit();
    await onDelete(name);
  }

  async function handleAdd() {
    setFormError(null);
    const name = newName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) {
      setFormError('Parameter name is required.');
      return;
    }
    if (items.some((i) => i.parameter_name === name)) {
      setFormError('A metadata entry for this parameter already exists.');
      return;
    }
    await onAdd({
      parameter_name: name,
      display_suffix: newSuffix.trim() || null,
      unit_options: parseUnitOptions(newUnits),
    });
    setNewName('');
    setNewSuffix('');
    setNewUnits('');
  }

  return (
    <div className={styles.editor}>
      <div className={styles.addForm}>
        <p className={styles.addFormLabel}>Add parameter metadata</p>
        <div className={styles.addFormRow}>
          <input
            className={styles.input}
            placeholder="parameter name (e.g. resistance)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="display suffix (e.g. band)"
            value={newSuffix}
            onChange={(e) => setNewSuffix(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="unit options (e.g. ft, in, cm)"
            value={newUnits}
            onChange={(e) => setNewUnits(e.target.value)}
          />
          <button
            type="button"
            className={styles.btnPrimary}
            onPointerUp={handleAdd}
            disabled={saving}
          >
            Add
          </button>
        </div>
        {formError && <p className={styles.errorText}>{formError}</p>}
      </div>

      {items.length === 0 && (
        <p className={styles.emptyState}>No form parameter metadata saved yet.</p>
      )}

      <div className={styles.list}>
        {items.map((item) => {
          const isEditing = editName === item.parameter_name;
          const isReviewing = archiveReviewName === item.parameter_name;
          return (
            <div key={item.parameter_name} className={styles.row}>
              <div className={styles.rowMeta}>
                <p className={styles.paramName}>{item.parameter_name}</p>
                {isEditing ? (
                  <div className={styles.editFields}>
                    <input
                      className={styles.input}
                      placeholder="display suffix"
                      value={editSuffix}
                      onChange={(e) => setEditSuffix(e.target.value)}
                    />
                    <input
                      className={styles.input}
                      placeholder="unit options (comma-separated)"
                      value={editUnits}
                      onChange={(e) => setEditUnits(e.target.value)}
                    />
                  </div>
                ) : (
                  <p className={styles.rowDetail}>
                    {item.display_suffix ? `suffix: ${item.display_suffix}` : ''}
                    {item.display_suffix && item.unit_options ? ' · ' : ''}
                    {item.unit_options ? `units: ${item.unit_options.join(', ')}` : ''}
                    {!item.display_suffix && !item.unit_options ? '—' : ''}
                  </p>
                )}
                {isReviewing && (
                  <div className={styles.archiveBox}>
                    <p className={styles.archiveTitle}>Archive this entry?</p>
                    <p className={styles.archiveText}>
                      Removes from active display only. Existing logged values are unaffected.
                    </p>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onPointerUp={() => setArchiveReviewName(null)}
                        disabled={saving}
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        className={destructiveButtonStyles.destructiveActionButton}
                        onPointerUp={() => handleConfirmArchive(item.parameter_name)}
                        disabled={saving}
                      >
                        Confirm archive
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.inlineActions}>
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onPointerUp={handleSaveEdit}
                      disabled={saving}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onPointerUp={handleCancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onPointerUp={() => handleStartEdit(item)}
                    disabled={saving}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className={destructiveButtonStyles.destructiveActionButton}
                  onPointerUp={() => setArchiveReviewName(item.parameter_name)}
                  disabled={saving}
                >
                  Archive…
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
