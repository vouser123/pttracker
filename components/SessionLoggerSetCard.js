// components/SessionLoggerSetCard.js — set-card renderer for session logger form rows
import NativeSelect from './NativeSelect';
import styles from './SessionLoggerModal.module.css';

function toLower(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function toTitleCase(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

// Unit options come from form_parameter_metadata via the formParameterMetadata prop.
// Removed hardcoded weight/distance special-cases (pt-2mwzy).
function getUnitOptions(paramName, formParameterMetadata) {
  return formParameterMetadata?.[paramName]?.unit_options ?? [];
}

function formatFieldLabel(value) {
  return toTitleCase(String(value).replace(/_/g, ' '));
}

export default function SessionLoggerSetCard({
  index,
  set,
  totalSets,
  showReps,
  showSeconds,
  showDistance,
  isSided,
  secondsLabel,
  formParams,
  historicalFormParams,
  formParameterMetadata = {},
  customModes,
  onSetCustomMode,
  onRemoveSet,
  onSetChange,
  onFormParamChange,
}) {
  return (
    <div className={styles.setCard}>
      <div className={styles.setHeader}>
        <h3 className={styles.setTitle}>Set {index + 1}</h3>
        <button
          className={styles.removeBtn}
          onPointerUp={() => onRemoveSet(index)}
          type="button"
          disabled={totalSets === 1}
        >
          Remove
        </button>
      </div>

      <div className={styles.fieldGrid}>
        {showReps && (
          <label className={styles.fieldLabel}>
            Reps
            <input
              className={styles.input}
              type="number"
              min="0"
              value={set.reps ?? ''}
              onChange={(event) =>
                onSetChange(index, { reps: Number(event.target.value || 0) || null })
              }
            />
          </label>
        )}
        {showSeconds && (
          <label className={styles.fieldLabel}>
            {secondsLabel}
            <input
              className={styles.input}
              type="number"
              min="0"
              value={set.seconds ?? ''}
              onChange={(event) =>
                onSetChange(index, { seconds: Number(event.target.value || 0) || null })
              }
            />
          </label>
        )}
        {showDistance && (
          <label className={styles.fieldLabel}>
            Distance (ft)
            <input
              className={styles.input}
              type="number"
              min="0"
              value={set.distance_feet ?? ''}
              onChange={(event) =>
                onSetChange(index, {
                  distance_feet: Number(event.target.value || 0) || null,
                })
              }
            />
          </label>
        )}
        {isSided && (
          <>
            <label className={styles.fieldLabel} htmlFor={`set-${index}-side`}>
              Side
            </label>
            <NativeSelect
              id={`set-${index}-side`}
              className={styles.select}
              value={set.side ?? 'right'}
              onChange={(value) => onSetChange(index, { side: value })}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </>
        )}
      </div>

      {formParams.length > 0 && (
        <div className={styles.formDataGrid}>
          {formParams.map((paramName) => {
            const existing = (set.form_data ?? []).find(
              (item) => item.parameter_name === paramName,
            );
            const options = getUnitOptions(paramName, formParameterMetadata);
            const hasUnit = options.length > 0;
            const currentUnit = existing?.parameter_unit || options[0] || null;
            const historicalValues = [
              ...(isSided
                ? (historicalFormParams?.[set.side ?? 'right']?.[paramName] ?? [])
                : (historicalFormParams?.[paramName] ?? [])),
            ];
            const existingValue = existing?.parameter_value ?? '';
            if (!hasUnit && existingValue && !historicalValues.includes(existingValue)) {
              historicalValues.push(existingValue);
              historicalValues.sort((a, b) => String(a).localeCompare(String(b)));
            }
            const key = `${index}:${paramName}`;
            const isCustom = Boolean(customModes[key]);
            const selectedValue = isCustom ? '__custom__' : existingValue || '';
            const paramControlId = `set-${index}-${paramName}`;

            return (
              <div key={paramName}>
                <label className={styles.fieldLabel} htmlFor={paramControlId}>
                  {formatFieldLabel(paramName)}
                </label>
                {hasUnit ? (
                  <div className={styles.withUnit}>
                    <input
                      id={paramControlId}
                      className={styles.input}
                      type="number"
                      min="0"
                      step="1"
                      value={existing?.parameter_value ?? ''}
                      onChange={(event) =>
                        onFormParamChange(index, paramName, event.target.value.trim(), currentUnit)
                      }
                    />
                    <NativeSelect
                      aria-label={`${formatFieldLabel(paramName)} unit`}
                      className={styles.select}
                      value={currentUnit}
                      onChange={(value) =>
                        onFormParamChange(index, paramName, existing?.parameter_value ?? '', value)
                      }
                      options={options.map((unit) => ({
                        value: unit,
                        label: unit,
                      }))}
                    />
                  </div>
                ) : (
                  <>
                    {historicalValues.length > 0 && (
                      <NativeSelect
                        id={paramControlId}
                        className={styles.select}
                        value={isCustom ? existingValue : selectedValue}
                        onChange={(value) => {
                          const nextIsCustom = Boolean(value) && !historicalValues.includes(value);
                          onSetCustomMode(index, paramName, nextIsCustom);
                          onFormParamChange(index, paramName, value, null);
                        }}
                        options={historicalValues}
                        allowOther
                        placeholder={`Select ${formatFieldLabel(paramName)}`}
                        formatValue={toLower}
                      />
                    )}
                    {(historicalValues.length === 0 || isCustom) && (
                      <input
                        id={paramControlId}
                        className={styles.input}
                        type="text"
                        value={existingValue}
                        onChange={(event) =>
                          onFormParamChange(index, paramName, event.target.value.trim(), null)
                        }
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
