// components/ProgramRolesSection.js — roles management section for the program workspace
import { useState } from 'react';
import destructiveButtonStyles from './DestructiveActionButton.module.css';
import formStyles from './ExerciseForm.module.css';
import NativeSelect from './NativeSelect';
import styles from './ProgramRolesSection.module.css';

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
    return <p className={formStyles.emptyNote}>Select an exercise to manage roles.</p>;
  }

  const roleCards = roles?.map((role, index) => {
    const roleKey =
      role.id ?? `${role.region}-${role.capacity}-${role.focus ?? 'general'}-${index}`;
    const contribution = (role.contribution ?? 'low').toLowerCase();
    const contributionToneClass =
      contribution === 'high'
        ? styles.roleContributionHigh
        : contribution === 'medium'
          ? styles.roleContributionMedium
          : styles.roleContributionLow;
    const roleSummary = [role.region, role.capacity, role.focus].filter(Boolean).join(' / ');

    return (
      <article key={roleKey} className={styles.roleCard}>
        <div className={styles.roleCardHeader}>
          <div className={styles.roleCardSummary}>
            <span className={`${styles.roleContributionBadge} ${contributionToneClass}`}>
              {contribution.toUpperCase()}
            </span>
            <p className={styles.roleCardText}>{roleSummary}</p>
          </div>
          <button
            type="button"
            className={destructiveButtonStyles.destructiveActionButton}
            onPointerUp={() => onDeleteRole(role.id)}
            disabled={rolesLoading || !role.id}
            aria-label="Remove role"
          >
            Remove
          </button>
        </div>
      </article>
    );
  });

  return (
    <div className={formStyles.sectionContent}>
      <p className={formStyles.hint}>
        Managing roles for <strong>{exercise.canonical_name}</strong>.
      </p>

      {roles && roles.length > 0 ? (
        <div className={styles.rolesList}>
          <p className={styles.currentRolesHeading}>Current Roles:</p>
          {roleCards}
        </div>
      ) : (
        <p className={formStyles.emptyNote}>No roles assigned yet.</p>
      )}

      <div className={styles.addRoleForm}>
        <p className={formStyles.fieldLabel}>Add Role</p>
        {addRoleError && <p className={formStyles.roleError}>{addRoleError}</p>}
        <div className={formStyles.formRow}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.fieldLabel} htmlFor={fieldIds.region}>
              Region *
            </label>
            <NativeSelect
              id={fieldIds.region}
              className={formStyles.select}
              value={newRegion}
              onChange={setNewRegion}
              disabled={rolesLoading}
              placeholder="Select..."
              options={regionOptions}
            />
          </div>
          <div className={formStyles.formGroup}>
            <label className={formStyles.fieldLabel} htmlFor={fieldIds.capacity}>
              Capacity *
            </label>
            <NativeSelect
              id={fieldIds.capacity}
              className={formStyles.select}
              value={newCapacity}
              onChange={setNewCapacity}
              disabled={rolesLoading}
              placeholder="Select..."
              options={capacityOptions}
            />
          </div>
        </div>
        <div className={formStyles.formRow}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.fieldLabel} htmlFor={fieldIds.focus}>
              Focus
            </label>
            <NativeSelect
              id={fieldIds.focus}
              className={formStyles.select}
              value={newFocus}
              onChange={setNewFocus}
              disabled={rolesLoading}
              placeholder="None"
              options={focusOptions}
            />
          </div>
          <div className={formStyles.formGroup}>
            <label className={formStyles.fieldLabel} htmlFor={fieldIds.contribution}>
              Contribution *
            </label>
            <NativeSelect
              id={fieldIds.contribution}
              className={formStyles.select}
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
          className={formStyles.btnSecondary}
          onPointerUp={handleAddRole}
          disabled={rolesLoading}
        >
          {rolesLoading ? 'Saving…' : '+ Add Role'}
        </button>
      </div>
    </div>
  );
}
