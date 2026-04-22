// components/ProgramDosageWorkspace.js — /program dosage workspace shell with patient context and selector controls

import NativeSelect from './NativeSelect';
import styles from './ProgramDosageWorkspace.module.css';
import ProgramPatientSelector from './ProgramPatientSelector';

export default function ProgramDosageWorkspace({
  patientOptions,
  selectedPatientId,
  onPatientChange,
  dosageSearch,
  onDosageSearchChange,
  dosageExerciseId,
  onDosageExerciseChange,
  dosageExerciseSelectOptions,
  dosageExercise,
  dosageSummary,
  onEditDosage,
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Manage Patient Dosages</h2>
      <p className={styles.description}>
        <strong>Dosages</strong> are the prescribed sets, reps, and parameters for each exercise.
      </p>
      {patientOptions?.length > 0 && (
        <div className={styles.patientSelectorRow}>
          <ProgramPatientSelector
            patientOptions={patientOptions}
            selectedPatientId={selectedPatientId}
            onChange={onPatientChange}
          />
        </div>
      )}
      <div className={styles.selectorStack}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search exercises…"
          value={dosageSearch}
          onChange={(event) => onDosageSearchChange(event.target.value)}
        />
        <NativeSelect
          className={styles.exerciseSelect}
          value={dosageExerciseId}
          onChange={onDosageExerciseChange}
          placeholder="-- Choose an exercise --"
          options={dosageExerciseSelectOptions}
        />
      </div>
      {dosageExercise ? (
        <div className={styles.dosageCard}>
          <p className={styles.dosageName}>{dosageExercise.canonical_name}</p>
          <p className={styles.dosageSummary}>
            {dosageSummary ? `Current dosage: ${dosageSummary}` : 'No dosage assigned yet.'}
          </p>
          <button type="button" className={styles.btnDosage} onPointerUp={onEditDosage}>
            {dosageSummary ? 'Edit dosage' : 'Set dosage'}
          </button>
        </div>
      ) : (
        <p className={styles.emptyState}>Select an exercise to manage dosage.</p>
      )}
    </section>
  );
}
