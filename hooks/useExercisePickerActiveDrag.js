// hooks/useExercisePickerActiveDrag.js — active drag motion and preview ordering for ExercisePicker
import { useCallback, useEffect, useRef, useState } from 'react';
import { reorderVisibleSubset } from '../lib/exercise-sort';
import { useExercisePickerDragDomEffects } from './useExercisePickerDragDomEffects';

function releasePointerCapture(target, pointerId) {
  if (pointerId == null) return;
  try {
    target?.releasePointerCapture?.(pointerId);
  } catch {}
}

export function useExercisePickerActiveDrag({
  isManualMode,
  normalizedManualOrderIds,
  visibleExerciseIds,
  onManualOrderChange,
}) {
  const [dragState, setDragState] = useState(null);
  const [previewOrderIds, setPreviewOrderIds] = useState(null);
  const cardRefs = useRef(new Map());
  const dragTargetRef = useRef(null);
  const dragOverlayRef = useRef(null);
  const listRef = useRef(null);

  const setCardRef = useCallback((exerciseId, node) => {
    if (!node) {
      cardRefs.current.delete(exerciseId);
      return;
    }
    cardRefs.current.set(exerciseId, node);
  }, []);

  const getCardRect = useCallback((exerciseId) => {
    return cardRefs.current.get(exerciseId)?.getBoundingClientRect() ?? null;
  }, []);

  const clearActiveDrag = useCallback(() => {
    dragTargetRef.current = null;
    setDragState(null);
    setPreviewOrderIds(null);
  }, []);

  const finishDrag = useCallback(
    (pointerId = dragState?.pointerId) => {
      if (!dragState) return;
      releasePointerCapture(dragTargetRef.current, pointerId);
      releasePointerCapture(dragOverlayRef.current, pointerId);
      if (dragState.dragging && previewOrderIds) onManualOrderChange?.(previewOrderIds);
      clearActiveDrag();
    },
    [clearActiveDrag, dragState, onManualOrderChange, previewOrderIds],
  );

  const activateDrag = useCallback((pendingDrag, pointerTarget) => {
    dragTargetRef.current = pointerTarget;
    releasePointerCapture(dragTargetRef.current, null);
    try {
      dragTargetRef.current?.setPointerCapture?.(pendingDrag.pointerId);
    } catch {}
    setDragState({
      dragging: true,
      ...pendingDrag,
    });
  }, []);

  const handleDragMove = useCallback(
    (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      if (event.cancelable) event.preventDefault();

      const nextX = event.clientX;
      const nextY = event.clientY;
      const listRect = listRef.current?.getBoundingClientRect();

      if (
        !listRect ||
        nextX < listRect.left - 24 ||
        nextX > listRect.right + 24 ||
        nextY < listRect.top ||
        nextY > listRect.bottom
      ) {
        setPreviewOrderIds(null);
        setDragState((previous) =>
          previous ? { ...previous, dragging: true, x: nextX, y: nextY } : previous,
        );
        return;
      }

      const sourceIndex = visibleExerciseIds.indexOf(dragState.exerciseId);
      let targetIndex = visibleExerciseIds.length - 1;

      for (let index = 0; index < visibleExerciseIds.length; index += 1) {
        const rect = getCardRect(visibleExerciseIds[index]);
        if (!rect) continue;
        if (nextY < rect.top + rect.height / 2) {
          targetIndex = index;
          break;
        }
      }

      setPreviewOrderIds(
        reorderVisibleSubset(
          previewOrderIds ?? normalizedManualOrderIds,
          visibleExerciseIds,
          sourceIndex,
          targetIndex,
        ),
      );
      setDragState((previous) =>
        previous ? { ...previous, dragging: true, x: nextX, y: nextY } : previous,
      );
    },
    [dragState, getCardRect, normalizedManualOrderIds, previewOrderIds, visibleExerciseIds],
  );

  const handleDragEnd = useCallback(
    (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      finishDrag(event.pointerId);
    },
    [dragState, finishDrag],
  );

  useEffect(() => {
    if (isManualMode) return;
    clearActiveDrag();
  }, [clearActiveDrag, isManualMode]);

  useExercisePickerDragDomEffects({
    dragState,
    dragOverlayRef,
    handleDragMove,
    handleDragEnd,
  });

  return {
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
  };
}
