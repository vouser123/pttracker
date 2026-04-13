// hooks/useExercisePickerManualReorder.js — hold-to-activate manual reorder orchestration for ExercisePicker
import { useCallback, useEffect, useRef, useState } from 'react';
import { useExercisePickerActiveDrag } from './useExercisePickerActiveDrag';

const DRAG_HOLD_DELAY_MS = 220;
const DRAG_CANCEL_MOVE_PX = 10;

export function useExercisePickerManualReorder({
  isManualMode,
  normalizedManualOrderIds,
  visibleExerciseIds,
  onManualOrderChange,
}) {
  const [pendingDrag, setPendingDrag] = useState(null);
  const pendingTargetRef = useRef(null);
  const {
    dragState,
    dragOverlayRef,
    listRef,
    previewOrderIds,
    setCardRef,
    getCardRect,
    activateDrag,
    clearActiveDrag,
    handleDragMove,
    handleDragEnd,
  } = useExercisePickerActiveDrag({
    isManualMode,
    normalizedManualOrderIds,
    visibleExerciseIds,
    onManualOrderChange,
  });

  const cancelPendingDrag = useCallback(() => {
    pendingTargetRef.current = null;
    setPendingDrag(null);
  }, []);

  const handleDragStart = useCallback(
    (event, exercise) => {
      if (!isManualMode) return;

      event.stopPropagation();

      const rect = getCardRect(exercise.id);
      pendingTargetRef.current = event.currentTarget;
      setPendingDrag({
        pointerId: event.pointerId,
        exerciseId: exercise.id,
        exerciseName: exercise.canonical_name,
        dosageText: exercise.dosageText,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        offsetX: rect ? event.clientX - rect.left : 24,
        offsetY: rect ? event.clientY - rect.top : 24,
        width: rect?.width ?? 0,
      });
    },
    [getCardRect, isManualMode],
  );

  useEffect(() => {
    if (isManualMode) return;
    cancelPendingDrag();
    clearActiveDrag();
  }, [cancelPendingDrag, clearActiveDrag, isManualMode]);

  useEffect(() => {
    if (!pendingDrag) return undefined;

    const activationTimer = window.setTimeout(() => {
      activateDrag(pendingDrag, pendingTargetRef.current);
      setPendingDrag(null);
    }, DRAG_HOLD_DELAY_MS);

    function handlePendingMove(event) {
      if (event.pointerId !== pendingDrag.pointerId) return;

      const dx = event.clientX - pendingDrag.startX;
      const dy = event.clientY - pendingDrag.startY;
      if (Math.hypot(dx, dy) > DRAG_CANCEL_MOVE_PX) {
        window.clearTimeout(activationTimer);
        cancelPendingDrag();
      }
    }

    function handlePendingEnd(event) {
      if (event.pointerId !== pendingDrag.pointerId) return;

      window.clearTimeout(activationTimer);
      cancelPendingDrag();
    }

    window.addEventListener('pointermove', handlePendingMove, { passive: true });
    window.addEventListener('pointerup', handlePendingEnd);
    window.addEventListener('pointercancel', handlePendingEnd);

    return () => {
      window.clearTimeout(activationTimer);
      window.removeEventListener('pointermove', handlePendingMove);
      window.removeEventListener('pointerup', handlePendingEnd);
      window.removeEventListener('pointercancel', handlePendingEnd);
    };
  }, [activateDrag, cancelPendingDrag, pendingDrag]);

  return {
    pendingDrag,
    dragState,
    dragOverlayRef,
    listRef,
    previewOrderIds,
    setCardRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
