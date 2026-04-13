// hooks/useTimerSpeech.js — panel-facing integration hook for TimerPanel
import { useMemo } from 'react';
import { getExerciseMode, getTargetReps, getTargetSeconds } from '../lib/timer-panel';
import { useExerciseTimer } from './useExerciseTimer';
import { useTimerAudio } from './useTimerAudio';
import { useTimerExecutionState } from './useTimerExecutionState';
import { useTimerPanelOutput } from './useTimerPanelOutput';

export function useTimerSpeech(
  exercise,
  isOpen = false,
  resetToken = 0,
  sessionProgress = null,
  selectedSide = null,
  onSelectedSideChange = null,
) {
  const mode = useMemo(() => getExerciseMode(exercise), [exercise]);
  const isSided = exercise?.pattern === 'side';
  const exerciseId = exercise?.id ?? null;
  const targetReps = useMemo(() => getTargetReps(exercise), [exercise]);
  const targetSeconds = useMemo(() => getTargetSeconds(exercise, mode), [exercise, mode]);
  const audio = useTimerAudio();

  const {
    executionState,
    incrementCounter,
    decrementCounter,
    resetCounter,
    setSelectedSide,
    getDurationCompletionSpeech,
  } = useTimerExecutionState({
    mode,
    isSided,
    exerciseId,
    targetReps,
    targetSeconds,
    isOpen,
    resetToken,
    selectedSide,
    onSelectedSideChange,
    sessionProgress,
    audio,
  });

  const timer = useExerciseTimer({
    mode,
    targetReps,
    targetSeconds,
    isOpen,
    resetToken,
    audio,
    getDurationCompletionSpeech,
  });

  const { repInfoText, targetDoseText, buildSetPatch, canApply } = useTimerPanelOutput({
    executionState,
    timer,
    exercise,
    mode,
    targetReps,
    targetSeconds,
  });

  return {
    mode,
    isSided,
    selectedSide: executionState.selectedSide,
    setSelectedSide,
    counterValue: executionState.counterValue,
    targetReps,
    targetSeconds,
    targetDoseText,
    repInfoText,
    canApply,
    incrementCounter,
    decrementCounter,
    resetCounter,
    buildCurrentSetPatch: buildSetPatch,
    ...timer,
  };
}
