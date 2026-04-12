// hooks/useTrackerPendingSetFlow.js — pending-set confirmation and undo workflow for the active tracker session
import { useCallback } from 'react';
import { normalizeSet } from '../lib/session-logging';

export function useTrackerPendingSetFlow({
  selectedExercise,
  draftSession,
  allLogs,
  buildExerciseFormContext,
  openManualLog,
  showToast,
  announceSessionProgress,
  pendingSetPatch,
  setPendingSetPatch,
  setPanelResetToken,
  setDraftSession,
}) {
  const handleTimerApplySet = useCallback(
    (setPatch) => {
      if (!selectedExercise) return;

      const exerciseWithContext = buildExerciseFormContext(
        selectedExercise,
        selectedExercise.pattern === 'side' ? (setPatch.side ?? 'right') : null,
      );
      const resolvedFormData = setPatch.form_data ?? exerciseWithContext?.default_form_data ?? null;
      const hasRequiredParams = (selectedExercise.form_parameters_required ?? []).length > 0;
      if (hasRequiredParams && !resolvedFormData) {
        openManualLog({ side: setPatch.side, seedSet: { ...setPatch, form_data: [] } });
        return;
      }

      setPendingSetPatch({ ...setPatch, form_data: resolvedFormData });
    },
    [buildExerciseFormContext, openManualLog, selectedExercise, setPendingSetPatch],
  );

  const handleConfirmNextSet = useCallback(() => {
    if (!selectedExercise || !pendingSetPatch || !draftSession) return;

    const normalizedSet = normalizeSet(
      {
        ...pendingSetPatch,
        set_number: draftSession.sets.length + 1,
        performed_at: draftSession.date,
      },
      draftSession.sets.length,
      draftSession.activityType,
    );
    const nextLoggedSets = [...draftSession.sets, normalizedSet];

    setDraftSession((previous) => (previous ? { ...previous, sets: nextLoggedSets } : previous));
    announceSessionProgress({
      logs: allLogs,
      exercise: selectedExercise,
      nextSets: nextLoggedSets,
      selectedSide: selectedExercise.pattern === 'side' ? normalizedSet.side : null,
    });
    setPendingSetPatch(null);
    setPanelResetToken((value) => value + 1);
  }, [
    allLogs,
    announceSessionProgress,
    draftSession,
    pendingSetPatch,
    selectedExercise,
    setDraftSession,
    setPanelResetToken,
    setPendingSetPatch,
  ]);

  const handleEditNextSet = useCallback(() => {
    if (!selectedExercise || !pendingSetPatch) return;
    openManualLog({ side: pendingSetPatch.side, seedSet: pendingSetPatch });
    setPendingSetPatch(null);
  }, [openManualLog, pendingSetPatch, selectedExercise, setPendingSetPatch]);

  const handlePreviousSet = useCallback(() => {
    if (!draftSession || draftSession.sets.length === 0) {
      showToast('No sets to undo', 'error');
      return false;
    }

    const removedSet = draftSession.sets[draftSession.sets.length - 1];
    const removedSetNumber = removedSet?.set_number ?? draftSession.sets.length;
    setDraftSession((previous) =>
      previous ? { ...previous, sets: previous.sets.slice(0, -1) } : previous,
    );
    showToast(`Removed set ${removedSetNumber}`, 'success');
    return true;
  }, [draftSession, setDraftSession, showToast]);

  const handleBlockedNextSet = useCallback(() => {
    showToast('Please enter a value greater than 0', 'error');
  }, [showToast]);

  return {
    handleTimerApplySet,
    handleConfirmNextSet,
    handleEditNextSet,
    handlePreviousSet,
    handleBlockedNextSet,
  };
}
