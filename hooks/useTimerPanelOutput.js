// hooks/useTimerPanelOutput.js — display text and apply-payload shaping for TimerPanel
import { useCallback, useMemo } from 'react';
import { getCanApply } from '../lib/logger-timer-machine';
import { buildCurrentSetPatch, getRepInfoText, getTargetDoseText } from '../lib/timer-panel';

export function useTimerPanelOutput({
  executionState,
  timer,
  exercise,
  mode,
  targetReps,
  targetSeconds,
}) {
  const repInfoText = useMemo(
    () =>
      getRepInfoText({
        mode,
        counterValue: executionState.counterValue,
        targetReps,
        completedReps: timer.completedReps,
        currentRep: timer.currentRep,
        totalReps: timer.totalReps,
      }),
    [
      executionState.counterValue,
      mode,
      targetReps,
      timer.completedReps,
      timer.currentRep,
      timer.totalReps,
    ],
  );

  const targetDoseText = useMemo(
    () => getTargetDoseText(exercise, mode, targetReps, targetSeconds),
    [exercise, mode, targetReps, targetSeconds],
  );

  const buildSetPatch = useCallback(
    () =>
      buildCurrentSetPatch({
        mode,
        counterValue: executionState.counterValue,
        elapsedSeconds: timer.elapsedSeconds,
        targetSeconds,
        targetReps,
        completedReps: timer.completedReps,
        totalReps: timer.totalReps,
        selectedSide: executionState.selectedSide,
        distanceFeet: exercise?.distance_feet,
        partialRep: false,
      }),
    [
      executionState.counterValue,
      executionState.selectedSide,
      exercise?.distance_feet,
      mode,
      targetReps,
      targetSeconds,
      timer.completedReps,
      timer.elapsedSeconds,
      timer.totalReps,
    ],
  );

  const canApply = useMemo(
    () =>
      getCanApply(
        {
          mode,
          counterValue: executionState.counterValue,
          elapsedMs: timer.elapsedSeconds * 1000,
          completedReps: timer.completedReps,
        },
        exercise?.distance_feet,
      ),
    [
      executionState.counterValue,
      exercise?.distance_feet,
      mode,
      timer.completedReps,
      timer.elapsedSeconds,
    ],
  );

  return { repInfoText, targetDoseText, buildSetPatch, canApply };
}
