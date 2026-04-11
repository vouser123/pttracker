// components/ExerciseFormTagSection.js — reusable tag-entry control for exercise form sections
import { useMemo, useState } from 'react';
import styles from './ExerciseForm.module.css';
import NativeSelect from './NativeSelect';

export default function ExerciseFormTagSection({
  label,
  items,
  options,
  onAdd,
  onRemove,
  normalizeInput = null,
  placeholder,
  emptyValueLabel,
}) {
  const [input, setInput] = useState('');
  const selectId = `tag-select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const normalizedOptions = useMemo(
    () =>
      (options ?? []).map((option) =>
        typeof option === 'string' ? { value: option, label: option } : option,
      ),
    [options],
  );

  function handleAdd() {
    const raw = input.trim();
    const value = normalizeInput ? normalizeInput(raw) : raw;
    if (value && !items.includes(value)) {
      onAdd(value);
      setInput('');
    }
  }

  return (
    <div className={styles.tagSection}>
      <p className={styles.fieldLabel}>{label}</p>
      <div className={styles.tagInput}>
        <NativeSelect
          id={selectId}
          className={styles.select}
          value={input}
          onChange={setInput}
          options={normalizedOptions}
          allowOther
          formatValue={normalizeInput}
          placeholder={placeholder}
        />
        <button type="button" onPointerUp={handleAdd} className={styles.btnSecondary}>
          Add
        </button>
      </div>
      {emptyValueLabel && <span className={styles.hint}>{emptyValueLabel}</span>}
      <div className={styles.tagList}>
        {items.map((item, index) => (
          <span key={item} className={styles.tag}>
            {item}
            <button
              type="button"
              className={styles.tagRemove}
              onPointerUp={() => onRemove(index)}
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
