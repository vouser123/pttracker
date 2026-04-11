// components/ExerciseRolesWorkspace.js — exercise roles workspace shell with selector controls

import styles from './ExerciseRolesWorkspace.module.css';
import NativeSelect from './NativeSelect';
import ProgramRolesSection from './ProgramRolesSection';

export default function ExerciseRolesWorkspace({
  roleSearch,
  onRoleSearchChange,
  roleExerciseId,
  onRoleExerciseChange,
  roleExerciseSelectOptions,
  roleExercise,
  rolesLoading,
  regionOptions,
  capacityOptions,
  focusOptions,
  contributionOptions,
  onAddRole,
  onDeleteRole,
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Assign Roles to Exercises</h2>
      <p className={styles.description}>
        <strong>Roles</strong> define how an exercise contributes to different movement capacities
        in different body regions.
      </p>
      <div className={styles.selectorStack}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search exercises…"
          value={roleSearch}
          onChange={(event) => onRoleSearchChange(event.target.value)}
        />
        <NativeSelect
          className={styles.exerciseSelect}
          value={roleExerciseId}
          onChange={onRoleExerciseChange}
          placeholder="-- Choose an exercise --"
          options={roleExerciseSelectOptions}
        />
      </div>
      <ProgramRolesSection
        exercise={roleExercise}
        roles={roleExercise?.roles ?? []}
        rolesLoading={rolesLoading}
        regionOptions={regionOptions}
        capacityOptions={capacityOptions}
        focusOptions={focusOptions}
        contributionOptions={contributionOptions}
        onAddRole={onAddRole}
        onDeleteRole={onDeleteRole}
      />
    </section>
  );
}
