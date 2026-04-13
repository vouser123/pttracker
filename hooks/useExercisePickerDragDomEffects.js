// hooks/useExercisePickerDragDomEffects.js — DOM listeners and touch-lock cleanup for active ExercisePicker drags
import { useEffect } from 'react';

export function useExercisePickerDragDomEffects({
  dragState,
  dragOverlayRef,
  handleDragMove,
  handleDragEnd,
}) {
  useEffect(() => {
    if (!dragState) return undefined;

    const { body, documentElement } = document;
    const previousBodyTouchAction = body.style.touchAction;
    const previousBodyUserSelect = body.style.userSelect;
    const previousHtmlTouchAction = documentElement.style.touchAction;

    body.style.touchAction = 'none';
    body.style.userSelect = 'none';
    documentElement.style.touchAction = 'none';

    try {
      dragOverlayRef.current?.setPointerCapture?.(dragState.pointerId);
    } catch {}

    window.addEventListener('pointermove', handleDragMove, { passive: false });
    window.addEventListener('pointerup', handleDragEnd);
    window.addEventListener('pointercancel', handleDragEnd);

    return () => {
      body.style.touchAction = previousBodyTouchAction;
      body.style.userSelect = previousBodyUserSelect;
      documentElement.style.touchAction = previousHtmlTouchAction;
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handleDragEnd);
      window.removeEventListener('pointercancel', handleDragEnd);
    };
  }, [dragOverlayRef, dragState, handleDragEnd, handleDragMove]);
}
