'use client';
/**
 * app/program/ProgramPage.js — Exercise editor route host (Client Component).
 * Migrated from pages/program.js. App Router metadata now lives in app/program/page.js.
 *
 * ORCHESTRATOR ONLY — this file wires auth, bootstrap hooks, offline queue hooks,
 * workspace state, and shared editor components together.
 */
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import AuthForm from '../../../components/AuthForm';
import ExerciseRolesWorkspace from '../../../components/ExerciseRolesWorkspace';
import NavMenu from '../../../components/NavMenu';
import ProgramDosageWorkspace from '../../../components/ProgramDosageWorkspace';
import ProgramExerciseSelector from '../../../components/ProgramExerciseSelector';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { useProgramDataSnapshot } from '../../../hooks/useProgramDataSnapshot';
import { useProgramMutationActions } from '../../../hooks/useProgramMutationActions';
import { useProgramMutationUi } from '../../../hooks/useProgramMutationUi';
import { useProgramOfflineQueue } from '../../../hooks/useProgramOfflineQueue';
import { useProgramPageData } from '../../../hooks/useProgramPageData';
import { useProgramVocabActions } from '../../../hooks/useProgramVocabActions';
import { useProgramWorkspaceState } from '../../../hooks/useProgramWorkspaceState';
import { useToast } from '../../../hooks/useToast';
import { formatDosageSummary } from '../../../lib/dosage-summary';
import { buildGroupedLifecycleOptions } from '../../../lib/exercise-lifecycle';
import { getProgramMutationLabel } from '../../../lib/program-offline';
import { supabase } from '../../../lib/supabase';
import { mapVocabTermsToOptions } from '../../../lib/vocab-options';
import styles from './ProgramPage.module.css';

const ExerciseForm = dynamic(() => import('../../../components/ExerciseForm'), {
  loading: () => null,
});
const DosageModal = dynamic(() => import('../../../components/DosageModal'), {
  loading: () => null,
});
const ProgramVocabEditor = dynamic(() => import('../../../components/ProgramVocabEditor'), {
  loading: () => null,
});

export default function ProgramPage({ initialAuthUserId = null }) {
  const { session, loading: authLoading, signIn, signOut } = useAuth();
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const {
    exercises,
    referenceData,
    vocabularies,
    programs,
    loadError,
    offlineNotice,
    currentUserRole,
    accessError,
    programPatientId,
    programPatientName,
    loadData,
    setProgramDataSnapshot,
  } = useProgramPageData({ session, initialAuthUserId });
  const { commitProgramData } = useProgramDataSnapshot({ setProgramDataSnapshot });
  const workspace = useProgramWorkspaceState({
    exercises,
    programs,
    enabled: Boolean(session) || Boolean(initialAuthUserId),
  });
  const {
    search,
    showArchived,
    roleSearch,
    dosageSearch,
    activeExercise,
    roleExerciseId,
    dosageExerciseId,
    dosageTarget,
    filtered,
    roleExerciseOptions,
    dosageExerciseOptions,
    formExercise,
    roleExercise,
    dosageExercise,
    selectedProgram,
    setSearch,
    setShowArchived,
    setRoleSearch,
    setDosageSearch,
    setActiveExercise,
    setRoleExerciseId,
    setDosageExerciseId,
    setDosageTarget,
    handleCancel,
    handleSelectExercise,
  } = workspace;
  const { showToast, toastMessage, toastType, toastVisible } = useToast();
  const roleExerciseSelectOptions = buildGroupedLifecycleOptions(roleExerciseOptions);
  const dosageExerciseSelectOptions = buildGroupedLifecycleOptions(dosageExerciseOptions);
  const regionOptions = mapVocabTermsToOptions(vocabularies?.region ?? []);
  const capacityOptions = mapVocabTermsToOptions(vocabularies?.capacity ?? []);
  const focusOptions = mapVocabTermsToOptions(vocabularies?.focus ?? []);
  const contributionOptions = mapVocabTermsToOptions(vocabularies?.contribution ?? []);
  const dosageSummary = formatDosageSummary(selectedProgram, { exercise: dosageExercise });

  const getCurrentSnapshot = useCallback(
    () => ({
      exercises,
      referenceData,
      vocabularies,
      programs,
      activeExercise,
    }),
    [activeExercise, exercises, programs, referenceData, vocabularies],
  );

  const commitSnapshot = useCallback(
    (snapshot) => {
      commitProgramData(snapshot);
      setActiveExercise(snapshot.activeExercise);
    },
    [commitProgramData, setActiveExercise],
  );

  const {
    mutationQueue,
    queueSummary,
    queueError,
    queueLoaded,
    queueSyncing,
    enqueueMutation,
    persistQueue,
    syncProgramMutations,
  } = useProgramOfflineQueue({
    session,
    programPatientId,
    loadData,
    showToast,
    commitSnapshot,
  });

  const {
    handleSaved,
    handleDosageSave,
    handleAddRole: handleAddRoleMutation,
    handleDeleteRole: handleDeleteRoleMutation,
  } = useProgramMutationActions({
    session,
    selectedExercise: roleExercise,
    programPatientId,
    dosageTarget,
    mutationQueue,
    enqueueMutation,
    persistQueue,
    commitSnapshot,
    showToast,
    getSnapshot: getCurrentSnapshot,
    setDosageTarget,
  });
  const {
    handleAddVocabTerm: handleAddVocabTermMutation,
    handleUpdateVocabTerm: handleUpdateVocabTermMutation,
    handleDeleteVocabTerm: handleDeleteVocabTermMutation,
  } = useProgramVocabActions({
    session,
    enqueueMutation,
    getSnapshot: getCurrentSnapshot,
  });
  const {
    rolesLoading,
    vocabSaving,
    handleExerciseSaved,
    handleAddRole,
    handleDeleteRole,
    handleAddVocabTerm,
    handleUpdateVocabTerm,
    handleDeleteVocabTerm,
  } = useProgramMutationUi({
    handleSaved,
    handleAddRoleMutation,
    handleDeleteRoleMutation,
    handleAddVocabTermMutation,
    handleUpdateVocabTermMutation,
    handleDeleteVocabTermMutation,
    setRoleExerciseId,
    setDosageExerciseId,
  });

  if (!session && !authLoading) {
    return <AuthForm onSignIn={signIn} />;
  }

  return (
    <main className={styles.main}>
      {accessError ? <p className={styles.errorBanner}>{accessError}</p> : null}
      {loadError ? <p className={styles.errorBanner}>{loadError}</p> : null}
      {offlineNotice ? <p className={styles.offlineNotice}>{offlineNotice}</p> : null}
      {accessError ? null : (
        <>
          {queueLoaded && mutationQueue.length > 0 && (
            <div className={queueError ? styles.queueBannerError : styles.queueBanner}>
              <p className={styles.queueBannerText}>
                {queueError
                  ? `${queueSummary.failedCount} failed ${getProgramMutationLabel(queueSummary.firstFailed)} change${queueSummary.failedCount === 1 ? '' : 's'} need attention.${queueSummary.pendingCount > 0 ? ` ${queueSummary.pendingCount} more change${queueSummary.pendingCount === 1 ? '' : 's'} are still queued.` : ''} ${queueError}`
                  : queueSyncing
                    ? `Syncing ${queueSummary.pendingCount} pending program change${queueSummary.pendingCount === 1 ? '' : 's'}…`
                    : `${queueSummary.pendingCount} program change${queueSummary.pendingCount === 1 ? '' : 's'} queued for sync.`}
              </p>
              {queueError && (
                <p className={styles.queueRecoveryHint}>
                  Open the affected item and save again to replace the failed queued change, or
                  retry sync after the blocking issue is fixed.
                </p>
              )}
              {!queueSyncing && (
                <button
                  type="button"
                  className={styles.queueRetryButton}
                  onPointerUp={() => syncProgramMutations()}
                >
                  Retry sync
                </button>
              )}
            </div>
          )}
          <Toast message={toastMessage} type={toastType} visible={toastVisible} />

          <div className={styles.header}>
            <h1 className={styles.title}>PT Editor</h1>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onPointerUp={() => setActiveExercise('new')}
              >
                ➕ New
              </button>
              {session && (
                <NavMenu
                  user={session.user}
                  isAdmin={currentUserRole === 'therapist' || currentUserRole === 'admin'}
                  onSignOut={() => signOut?.() ?? supabase.auth.signOut()}
                  currentPage="pt_editor"
                  actions={[]}
                  onAction={() => {}}
                />
              )}
            </div>
          </div>

          <ProgramExerciseSelector
            search={search}
            onSearchChange={setSearch}
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
            activeExerciseId={activeExercise?.id ?? ''}
            onExerciseChange={handleSelectExercise}
            exerciseOptions={filtered}
          />

          {activeExercise !== null && (
            <ExerciseForm
              exercise={formExercise}
              exercises={exercises}
              referenceData={referenceData}
              vocabularies={vocabularies}
              accessToken={session?.access_token}
              onSubmitExercise={handleExerciseSaved}
              onCancel={handleCancel}
            />
          )}

          <ExerciseRolesWorkspace
            roleSearch={roleSearch}
            onRoleSearchChange={setRoleSearch}
            roleExerciseId={roleExerciseId}
            onRoleExerciseChange={setRoleExerciseId}
            roleExerciseSelectOptions={roleExerciseSelectOptions}
            roleExercise={roleExercise}
            rolesLoading={rolesLoading}
            regionOptions={regionOptions}
            capacityOptions={capacityOptions}
            focusOptions={focusOptions}
            contributionOptions={contributionOptions}
            onAddRole={handleAddRole}
            onDeleteRole={handleDeleteRole}
          />

          <ProgramDosageWorkspace
            programPatientName={programPatientName}
            dosageSearch={dosageSearch}
            onDosageSearchChange={setDosageSearch}
            dosageExerciseId={dosageExerciseId}
            onDosageExerciseChange={setDosageExerciseId}
            dosageExerciseSelectOptions={dosageExerciseSelectOptions}
            dosageExercise={dosageExercise}
            dosageSummary={dosageSummary}
            onEditDosage={() =>
              setDosageTarget({ exercise: dosageExercise, program: selectedProgram })
            }
          />

          <section className={styles.workspaceSection}>
            <details
              className={styles.vocabDetails}
              onToggle={(event) => setIsVocabOpen(event.currentTarget.open)}
            >
              <summary className={styles.vocabSummary}>Manage Vocabulary</summary>
              <p className={styles.sectionDescription}>
                Controlled vocabularies define the valid codes used by the editor and shared role
                selectors.
              </p>
              {isVocabOpen && (
                <ProgramVocabEditor
                  vocabularies={vocabularies}
                  onAddTerm={handleAddVocabTerm}
                  onUpdateTerm={handleUpdateVocabTerm}
                  onDeleteTerm={handleDeleteVocabTerm}
                  saving={vocabSaving}
                />
              )}
            </details>
          </section>

          {dosageTarget && (
            <DosageModal
              exercise={dosageTarget.exercise}
              program={dosageTarget.program}
              onSave={handleDosageSave}
              onClose={() => setDosageTarget(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
