// hooks/useTrackerSession.js — active tracker session orchestration across selection, pending sets, and finalization
import { useCallback, useState } from 'react';
import { useTrackerExerciseSessionState } from './useTrackerExerciseSessionState';
import { useTrackerPendingSetFlow } from './useTrackerPendingSetFlow';
import { useTrackerSessionLifecycle } from './useTrackerSessionLifecycle';

/**
 * Active in-progress tracker session state for the tracker route.
 * @param {object} options
 * @returns {object}
 */
export function useTrackerSession({
  pickerExercises,
  logs,
  openManualLog,
  showSaveSuccess,
  showToast,
  announceSessionProgress,
  enqueue,
  sync,
  reload,
}) {
  const [panelResetToken, setPanelResetToken] = useState(0);
  const [pendingSetPatch, setPendingSetPatch] = useState(null);

  const handleTimerOpenManual = useCallback(
    (options = {}) => openManualLog(options),
    [openManualLog],
  );

  const {
    buildExerciseFormContext,
    selectedExerciseId,
    selectedExercise,
    draftSession,
    isTimerOpen,
    currentSide,
    activeExercise,
    sessionStartedAt,
    setDraftSession,
    setIsTimerOpen,
    setCurrentSide,
    setActiveExercise,
    handleExerciseSelect,
    handleTimerBack,
    abandonDraftSession,
  } = useTrackerExerciseSessionState({
    pickerExercises,
    logs,
    clearPendingSetPatch: () => setPendingSetPatch(null),
  });

  const {
    notesModalOpen,
    backdateEnabled,
    backdateValue,
    optimisticLogs,
    allLogs,
    setBackdateValue,
    handleFinishSession,
    handleNotesModalClose,
    handleCancelSession,
    handleToggleBackdate,
    handleSaveFinishedSession,
  } = useTrackerSessionLifecycle({
    draftSession,
    selectedExercise,
    logs,
    showSaveSuccess,
    showToast,
    enqueue,
    sync,
    reload,
    abandonDraftSession,
    setActiveExercise,
  });

  const {
    handleTimerApplySet,
    handleConfirmNextSet,
    handleEditNextSet,
    handlePreviousSet,
    handleBlockedNextSet,
  } = useTrackerPendingSetFlow({
    selectedExercise,
    draftSession,
    allLogs,
    buildExerciseFormContext,
    openManualLog: handleTimerOpenManual,
    showToast,
    announceSessionProgress,
    pendingSetPatch,
    setPendingSetPatch,
    setPanelResetToken,
    setDraftSession,
  });

  return {
    selectedExerciseId,
    selectedExercise,
    draftSession,
    isTimerOpen,
    panelResetToken,
    pendingSetPatch,
    notesModalOpen,
    backdateEnabled,
    backdateValue,
    optimisticLogs,
    allLogs,
    activeExercise,
    sessionStartedAt,
    currentSide,
    setDraftSession,
    setPendingSetPatch,
    setBackdateValue,
    setActiveExercise,
    setIsTimerOpen,
    setPanelResetToken,
    setCurrentSide,
    handleExerciseSelect,
    handleTimerBack,
    handleFinishSession,
    handleNotesModalClose,
    handleCancelSession,
    handleToggleBackdate,
    handleTimerApplySet,
    handleTimerOpenManual,
    handleConfirmNextSet,
    handleEditNextSet,
    handleSaveFinishedSession,
    handlePreviousSet,
    handleBlockedNextSet,
    buildExerciseFormContext,
  };
}
