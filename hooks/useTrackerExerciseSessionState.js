// hooks/useTrackerExerciseSessionState.js — selected-exercise and draft-session lifecycle for the active tracker flow
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDraftSession } from '../lib/index-tracker-session';
import { inferActivityType } from '../lib/session-logging';
import { buildTrackerExerciseFormContext } from '../lib/tracker-exercise-context';

export function useTrackerExerciseSessionState({ pickerExercises, logs, clearPendingSetPatch }) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [draftSession, setDraftSession] = useState(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [currentSide, setCurrentSide] = useState(null);
  const [activeExercise, setActiveExercise] = useState(null);

  const sessionStartedAt = useMemo(
    () => draftSession?.date ?? new Date().toISOString(),
    [draftSession?.date],
  );

  const buildExerciseFormContext = useCallback(
    (exercise, side = null) =>
      buildTrackerExerciseFormContext({
        exercise,
        allLogs: logs,
        draftSession,
        side,
      }),
    [draftSession, logs],
  );

  const abandonDraftSession = useCallback(() => {
    setDraftSession(null);
    setSelectedExerciseId(null);
    setSelectedExercise(null);
    setCurrentSide(null);
    setIsTimerOpen(false);
    clearPendingSetPatch();
  }, [clearPendingSetPatch]);

  const handleExerciseSelect = useCallback(
    (exerciseId) => {
      setSelectedExerciseId(exerciseId);
      const selected = pickerExercises.find((exercise) => exercise.id === exerciseId) || null;
      const nextSide = selected?.pattern === 'side' ? 'right' : null;
      const enrichedSelected = selected ? buildExerciseFormContext(selected, nextSide) : null;
      setSelectedExercise(enrichedSelected);
      setCurrentSide(nextSide);
      if (!enrichedSelected) return;

      setDraftSession(createDraftSession(enrichedSelected, inferActivityType(enrichedSelected)));
      clearPendingSetPatch();
      setActiveExercise({ id: enrichedSelected.id, name: enrichedSelected.canonical_name || '' });
      setIsTimerOpen(true);
    },
    [buildExerciseFormContext, clearPendingSetPatch, pickerExercises],
  );

  const handleTimerBack = useCallback(() => {
    const loggedSetCount = draftSession?.sets?.length ?? 0;
    if (
      loggedSetCount > 0 &&
      typeof window !== 'undefined' &&
      !window.confirm('Discard this in-progress session? Logged sets will be lost.')
    ) {
      return;
    }
    abandonDraftSession();
    setActiveExercise(null);
  }, [abandonDraftSession, draftSession?.sets?.length]);

  useEffect(() => {
    if (!selectedExerciseId) return;

    const refreshedExercise =
      pickerExercises.find((exercise) => exercise.id === selectedExerciseId) || null;
    if (!refreshedExercise) return;

    const nextSelectedSide = refreshedExercise.pattern === 'side' ? (currentSide ?? 'right') : null;
    setSelectedExercise(buildExerciseFormContext(refreshedExercise, nextSelectedSide));
  }, [buildExerciseFormContext, currentSide, pickerExercises, selectedExerciseId]);

  return {
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
  };
}
