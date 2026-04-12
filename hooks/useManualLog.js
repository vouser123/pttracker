// hooks/useManualLog.js — manual tracker logging state and modal handlers for in-progress sessions
import { useCallback, useState } from 'react';
import {
  appendManualLogSet,
  createEmptyManualLogState,
  createOpenedManualLogState,
  getManualComparisonSide,
  getManualLogValidationError,
  normalizeManualLogSets,
  patchManualLogSet,
  removeManualLogSet,
  updateManualLogFormParam,
} from '../lib/manual-log-state';
export function useManualLog({
  draftSession,
  selectedExercise,
  allLogs,
  buildExerciseFormContext,
  setDraftSession,
  setIsTimerOpen,
  setPanelResetToken,
  announceSessionProgress,
}) {
  const [manualLogState, setManualLogState] = useState(createEmptyManualLogState);

  const openManualLog = useCallback(
    (options = {}) => {
      if (!selectedExercise || !draftSession) return;
      const side =
        selectedExercise.pattern === 'side'
          ? (options.side ?? options.seedSet?.side ?? 'right')
          : null;
      const exerciseWithContext = buildExerciseFormContext
        ? (buildExerciseFormContext(selectedExercise, side) ?? selectedExercise)
        : selectedExercise;
      setManualLogState(
        createOpenedManualLogState({
          exercise: exerciseWithContext,
          side,
          seedSet: options.seedSet,
          performedAt: draftSession.date,
        }),
      );
      setIsTimerOpen(false);
    },
    [buildExerciseFormContext, draftSession, selectedExercise, setIsTimerOpen],
  );

  const handleManualAddSet = useCallback(() => {
    setManualLogState((previous) => ({
      ...previous,
      sets: appendManualLogSet(previous.sets, previous.exercise),
    }));
  }, []);

  const handleManualRemoveSet = useCallback((index) => {
    setManualLogState((previous) => ({
      ...previous,
      sets: removeManualLogSet(previous.sets, index),
    }));
  }, []);

  const updateManualSet = useCallback(
    (index, patch) => {
      setManualLogState((previous) => {
        const nextState = patchManualLogSet({
          sets: previous.sets,
          index,
          patch,
          exercise: previous.exercise,
          buildExerciseFormContext,
        });
        return {
          ...previous,
          exercise: nextState.exercise,
          sets: nextState.sets,
        };
      });
    },
    [buildExerciseFormContext],
  );

  const updateManualFormParam = useCallback((index, paramName, paramValue, paramUnit = null) => {
    setManualLogState((previous) => ({
      ...previous,
      sets: updateManualLogFormParam({
        sets: previous.sets,
        index,
        paramName,
        paramValue,
        paramUnit,
      }),
    }));
  }, []);

  const handleManualModalSubmit = useCallback(() => {
    if (!manualLogState.exercise || !draftSession) return;
    const validationError = getManualLogValidationError({
      draftSession,
      sets: manualLogState.sets,
    });
    if (validationError) {
      setManualLogState((previous) => ({ ...previous, error: validationError }));
      return;
    }
    const normalizedSets = normalizeManualLogSets({
      sets: manualLogState.sets,
      draftSession,
    });
    const nextLoggedSets = [...draftSession.sets, ...normalizedSets];

    setDraftSession((previous) => (previous ? { ...previous, sets: nextLoggedSets } : previous));
    setManualLogState(createEmptyManualLogState());
    setIsTimerOpen(true);
    announceSessionProgress({
      logs: allLogs,
      exercise: selectedExercise,
      nextSets: nextLoggedSets,
      selectedSide: getManualComparisonSide(selectedExercise, normalizedSets),
    });
    setPanelResetToken((value) => value + 1);
  }, [
    allLogs,
    announceSessionProgress,
    draftSession,
    manualLogState.exercise,
    manualLogState.sets,
    selectedExercise,
    setDraftSession,
    setIsTimerOpen,
    setPanelResetToken,
  ]);

  const handleManualModalClose = useCallback(() => {
    setManualLogState(createEmptyManualLogState());
    if (selectedExercise) setIsTimerOpen(true);
  }, [selectedExercise, setIsTimerOpen]);

  return {
    manualLogState,
    openManualLog,
    handleManualAddSet,
    handleManualRemoveSet,
    updateManualSet,
    updateManualFormParam,
    handleManualModalSubmit,
    handleManualModalClose,
  };
}
