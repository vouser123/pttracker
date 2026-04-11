// components/ProgramRolesSection.js — roles management section for the program workspace
import { useState } from 'react';
import styles from './ExerciseForm.module.css';
import NativeSelect from './NativeSelect';

export default function ProgramRolesSection({
  exercise,
  roles,
  rolesLoading,
  regionOptions,
  capacityOptions,
  focusOptions,
  contributionOptions,
  onAddRole,
  onDeleteRole,
}) {
  const fieldIds = {
    region: 'program-role-region',
    capacity: 'program-role-capacity',
    focus: 'program-role-focus',
    contribution: 'program-role-contribution',
  };
  const [newRegion, setNewRegion] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newFocus, setNewFocus] = useState('');
  const [newContribution, setNewContribution] = useState('');
  const [addRoleError, setAddRoleError] = useState(null);

  async function handleAddRole() {
    setAddRoleError(null);
    if (!exercise?.id) {
      setAddRoleError('Save and select an exercise first.');
      return;
    }
    if (!newRegion || !newCapacity || !newContribution) {
      setAddRoleError('Region, Capacity, and Contribution are required.');
      return;
    }
    try {
      await onAddRole({
        region: newRegion,
        capacity: newCapacity,
        focus: newFocus || null,
        contribution: newContribution,
      });
      setNewRegion('');
      setNewCapacity('');
      setNewFocus('');
      setNewContribution('');
    } catch (err) {
      setAddRoleError(err.message);
    }
  }

  if (!exercise?.id) {
    return <p className={styles.emptyNote}>Select an exercise to manage roles.</p>;
  }

  return (
    <div className={styles.sectionContent}>
      <p className={styles.hint}>
        Managing roles for <strong>{exercise.canonical_name}</strong>.
      </p>

      {roles && roles.length > 0 ? (
        <table className={styles.rolesTable}>
          <thead>
            <tr>
              <th>Region</th>
              <th>Capacity</th>
              <th>Focus</th>
              <th>Contribution</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role, index) => (
              <tr
                key={
                  role.id ?? `${role.region}-${role.capacity}-${role.focus ?? 'general'}-${index}`
                }
              >
                <td>{role.region}</td>
                <td>{role.capacity}</td>
                <td>{role.focus ?? '—'}</td>
                <td>{role.contribution}</td>
                <td>
                  <button
                    type="button"
                    className={styles.roleRemoveBtn}
                    onPointerUp={() => onDeleteRole(role.id)}
                    disabled={rolesLoading || !role.id}
                    aria-label="Remove role"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.emptyNote}>No roles assigned yet.</p>
      )}

      <div className={styles.addRoleForm}>
        <p className={styles.fieldLabel}>Add Role</p>
        {addRoleError && <p className={styles.roleError}>{addRoleError}</p>}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.region}>
              Region *
            </label>
            <NativeSelect
              id={fieldIds.region}
              className={styles.select}
              value={newRegion}
              onChange={setNewRegion}
              disabled={rolesLoading}
              placeholder="Select..."
              options={regionOptions}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.capacity}>
              Capacity *
            </label>
            <NativeSelect
              id={fieldIds.capacity}
              className={styles.select}
              value={newCapacity}
              onChange={setNewCapacity}
              disabled={rolesLoading}
              placeholder="Select..."
              options={capacityOptions}
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.focus}>
              Focus
            </label>
            <NativeSelect
              id={fieldIds.focus}
              className={styles.select}
              value={newFocus}
              onChange={setNewFocus}
              disabled={rolesLoading}
              placeholder="None"
              options={focusOptions}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor={fieldIds.contribution}>
              Contribution *
            </label>
            <NativeSelect
              id={fieldIds.contribution}
              className={styles.select}
              value={newContribution}
              onChange={setNewContribution}
              disabled={rolesLoading}
              placeholder="Select..."
              options={contributionOptions}
            />
          </div>
        </div>
        <button
          type="button"
          className={styles.btnSecondary}
          onPointerUp={handleAddRole}
          disabled={rolesLoading}
        >
          {rolesLoading ? 'Saving…' : '+ Add Role'}
        </button>
      </div>
    </div>
  );
}
