// hooks/useTimerExecutionState.js — execution state machine for the tracker logger panel
import { useCallback, useEffect, useState } from 'react';
import { applyLoggerTimerEvent, createLoggerTimerState } from '../lib/logger-timer-machine';
import { getDurationCompletionSpeech as getDurationCompletionSpeechPure } from '../lib/timer-panel';

export function useTimerExecutionState({
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
}) {
  const [executionState, setExecutionState] = useState(() =>
    createLoggerTimerState({
      mode,
      targetReps,
      targetSeconds,
      isSided,
      selectedSide: isSided ? 'right' : null,
    }),
  );

  const getDurationCompletionSpeech = useCallback(
    () => getDurationCompletionSpeechPure(sessionProgress, isSided, executionState.selectedSide),
    [executionState.selectedSide, isSided, sessionProgress],
  );

  useEffect(() => {
    setExecutionState((previous) => {
      // Preserve selected side when staying on the same exercise without an explicit reset.
      // A new resetToken clears the side; open/close alone does not.
      const sameExerciseAndNoReset =
        previous?.exerciseId === exerciseId && (previous?._resetToken ?? 0) === resetToken;
      const preservedSide =
        sameExerciseAndNoReset && isSided && previous?.selectedSide
          ? previous.selectedSide
          : isSided
            ? 'right'
            : null;
      const nextSide = isSided ? (selectedSide ?? preservedSide ?? 'right') : null;
      return {
        ...createLoggerTimerState({
          mode,
          targetReps,
          targetSeconds,
          isSided,
          selectedSide: nextSide,
        }),
        exerciseId,
        // Only advance the stored reset token while the panel is open so that
        // a close-then-reopen is not mistaken for an explicit reset.
        _resetToken: isOpen ? resetToken : (previous?._resetToken ?? resetToken),
      };
    });
  }, [exerciseId, isOpen, isSided, mode, resetToken, selectedSide, targetReps, targetSeconds]);

  const dispatchExecutionEvent = useCallback(
    (event) => {
      setExecutionState((prev) => {
        const { state, effects } = applyLoggerTimerEvent(prev, event);
        audio.executeEffects(effects);
        return state;
      });
    },
    [audio],
  );

  const incrementCounter = useCallback(
    () => dispatchExecutionEvent({ type: 'INCREMENT_COUNTER' }),
    [dispatchExecutionEvent],
  );

  const decrementCounter = useCallback(
    () => dispatchExecutionEvent({ type: 'DECREMENT_COUNTER' }),
    [dispatchExecutionEvent],
  );

  const resetCounter = useCallback(() => {
    setExecutionState((prev) => ({ ...prev, counterValue: 0, partialRep: false }));
  }, []);

  const setSelectedSide = useCallback(
    (side) => {
      dispatchExecutionEvent({ type: 'SELECT_SIDE', side });
      onSelectedSideChange?.(side);
    },
    [dispatchExecutionEvent, onSelectedSideChange],
  );

  return {
    executionState,
    incrementCounter,
    decrementCounter,
    resetCounter,
    setSelectedSide,
    getDurationCompletionSpeech,
  };
}
