// ExerciseFormCore.js — exercise form sections 1–4: basic info, equipment, muscles, form parameters

import styles from './ExerciseForm.module.css';
import ExerciseFormTagSection from './ExerciseFormTagSection';
import NativeSelect from './NativeSelect';

// Intentionally hardcoded behavior enum; approved by user on 2026-03-19.
// Do not extend without explicit sign-off. These values drive distinct dosage/timer behavior paths.
const MODIFIERS = ['duration_seconds', 'hold_seconds', 'distance_feet'];

function toLower(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function toSentenceCase(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function mapVocabTermsToOptions(terms = []) {
  return (terms ?? []).map((term) => {
    const code = term?.code ?? '';
    const definition = term?.definition ?? '';
    return {
      value: code,
      label: definition ? `${code} - ${definition}` : code,
    };
  });
}

export default function ExerciseFormCore({
  basics,
  onBasicsChange,
  patternModifiers,
  onPatternModifiersChange,
  equipment,
  onEquipmentChange,
  muscles,
  onMusclesChange,
  formParameters,
  onFormParametersChange,
  referenceData,
  vocabularies,
}) {
  const fieldIds = {
    exerciseId: 'exercise-form-id',
    canonicalName: 'exercise-form-canonical-name',
    description: 'exercise-form-description',
    category: 'exercise-form-category',
    pattern: 'exercise-form-pattern',
  };

  function field(name) {
    return {
      value: basics[name] ?? '',
      onChange: (e) => onBasicsChange({ ...basics, [name]: e.target.value }),
    };
  }

  function selectField(name) {
    return {
      value: basics[name] ?? '',
      onChange: (value) => onBasicsChange({ ...basics, [name]: value }),
    };
  }

  function toggleModifier(mod) {
    const updated = patternModifiers.includes(mod)
      ? patternModifiers.filter((m) => m !== mod)
      : [...patternModifiers, mod];
    onPatternModifiersChange(updated);
  }

  return (
    <>
      <details open className={styles.section}>
        <summary className={styles.sectionHeader}>Basic Information</summary>
        <div className={styles.sectionContent}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.exerciseId}>
              Exercise ID
            </label>
            <input id={fieldIds.exerciseId} className={styles.input} {...field('id')} readOnly />
            <span className={styles.hint}>Auto-assigned UUID. Read-only.</span>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.canonicalName}>
              Canonical Name *
            </label>
            <input
              id={fieldIds.canonicalName}
              className={styles.input}
              {...field('canonical_name')}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.description}>
              Description *
            </label>
            <textarea
              id={fieldIds.description}
              className={styles.textarea}
              rows={3}
              {...field('description')}
              required
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor={fieldIds.category}>
                Category *
              </label>
              <NativeSelect
                id={fieldIds.category}
                className={styles.select}
                {...selectField('pt_category')}
                placeholder="Select..."
                options={mapVocabTermsToOptions(vocabularies?.pt_category ?? [])}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor={fieldIds.pattern}>
                Pattern *
              </label>
              <NativeSelect
                id={fieldIds.pattern}
                className={styles.select}
                {...selectField('pattern')}
                placeholder="Select..."
                options={mapVocabTermsToOptions(vocabularies?.pattern ?? [])}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <p className={styles.fieldLabel}>Pattern Modifiers</p>
            <div className={styles.checkboxGroup}>
              {MODIFIERS.map((mod) => (
                <label key={mod} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={patternModifiers.includes(mod)}
                    onChange={() => toggleModifier(mod)}
                  />
                  {mod}
                </label>
              ))}
            </div>
          </div>
        </div>
      </details>

      <details className={styles.section}>
        <summary className={styles.sectionHeader}>Equipment</summary>
        <div className={styles.sectionContent}>
          <ExerciseFormTagSection
            label="Required Equipment"
            items={equipment.required}
            options={referenceData.equipment}
            normalizeInput={toSentenceCase}
            placeholder="Select equipment..."
            emptyValueLabel="Choose an existing item or use Other to add a new one."
            onAdd={(item) => onEquipmentChange('required', [...equipment.required, item])}
            onRemove={(i) =>
              onEquipmentChange(
                'required',
                equipment.required.filter((_, idx) => idx !== i),
              )
            }
          />
          <ExerciseFormTagSection
            label="Optional Equipment"
            items={equipment.optional}
            options={referenceData.equipment}
            normalizeInput={toSentenceCase}
            placeholder="Select equipment..."
            emptyValueLabel="Choose an existing item or use Other to add a new one."
            onAdd={(item) => onEquipmentChange('optional', [...equipment.optional, item])}
            onRemove={(i) =>
              onEquipmentChange(
                'optional',
                equipment.optional.filter((_, idx) => idx !== i),
              )
            }
          />
        </div>
      </details>

      <details className={styles.section}>
        <summary className={styles.sectionHeader}>Muscles</summary>
        <div className={styles.sectionContent}>
          <ExerciseFormTagSection
            label="Primary Muscles"
            items={muscles.primary}
            options={referenceData.muscles}
            normalizeInput={toSentenceCase}
            placeholder="Select muscle..."
            emptyValueLabel="Choose an existing item or use Other to add a new one."
            onAdd={(item) => onMusclesChange('primary', [...muscles.primary, item])}
            onRemove={(i) =>
              onMusclesChange(
                'primary',
                muscles.primary.filter((_, idx) => idx !== i),
              )
            }
          />
          <ExerciseFormTagSection
            label="Secondary Muscles"
            items={muscles.secondary}
            options={referenceData.muscles}
            normalizeInput={toSentenceCase}
            placeholder="Select muscle..."
            emptyValueLabel="Choose an existing item or use Other to add a new one."
            onAdd={(item) => onMusclesChange('secondary', [...muscles.secondary, item])}
            onRemove={(i) =>
              onMusclesChange(
                'secondary',
                muscles.secondary.filter((_, idx) => idx !== i),
              )
            }
          />
        </div>
      </details>

      <details className={styles.section}>
        <summary className={styles.sectionHeader}>Form Parameters</summary>
        <div className={styles.sectionContent}>
          <ExerciseFormTagSection
            label="Required Form Parameters"
            items={formParameters}
            options={referenceData.formParameters}
            normalizeInput={toLower}
            placeholder="Select parameter..."
            emptyValueLabel="Choose an existing item or use Other to add a new one."
            onAdd={(item) => onFormParametersChange([...formParameters, item])}
            onRemove={(i) => onFormParametersChange(formParameters.filter((_, idx) => idx !== i))}
          />
        </div>
      </details>
    </>
  );
}
