// hooks/useExercisePickerModel.js — tracker exercise picker query, display shaping, and reorder orchestration
import { useMemo, useState } from 'react';
import { buildVisibleExerciseCard } from '../lib/exercise-picker-display';
import { normalizeManualOrderIds, sortExercises } from '../lib/exercise-sort';
import { resolveEffectiveStatus } from '../lib/program-status';
import { useExercisePickerManualReorder } from './useExercisePickerManualReorder';

export function useExercisePickerModel({
  exercises = [],
  programs = [],
  sortMode = 'pt_order',
  lifecycleFilter = 'routine',
  manualOrderIds = [],
  onManualOrderChange,
}) {
  const [query, setQuery] = useState('');

  const programsByExercise = useMemo(() => {
    const map = new Map();
    for (const program of programs) {
      if (program?.exercise_id) {
        map.set(program.exercise_id, program);
      }
    }
    return map;
  }, [programs]);

  const normalizedManualOrderIds = useMemo(
    () => normalizeManualOrderIds(exercises, manualOrderIds),
    [exercises, manualOrderIds],
  );
  const isManualMode = sortMode === 'manual';
  const resolveExerciseStatus = useMemo(
    () => (exercise, program) =>
      resolveEffectiveStatus(
        exercise?.lifecycle?.status ?? exercise?.lifecycle_status ?? 'active',
        program?.assignment_status,
      ),
    [],
  );

  const visibleExercises = useMemo(
    () =>
      sortExercises({
        exercises,
        programsByExercise,
        sortMode,
        lifecycleFilter,
        query,
        manualOrderIds,
        resolveStatus: resolveExerciseStatus,
      }),
    [
      exercises,
      lifecycleFilter,
      manualOrderIds,
      programsByExercise,
      query,
      resolveExerciseStatus,
      sortMode,
    ],
  );
  const visibleExerciseIds = useMemo(
    () => visibleExercises.map((exercise) => exercise.id),
    [visibleExercises],
  );

  const {
    pendingDrag,
    dragState,
    dragOverlayRef,
    listRef,
    previewOrderIds,
    setCardRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useExercisePickerManualReorder({
    isManualMode,
    normalizedManualOrderIds,
    visibleExerciseIds,
    onManualOrderChange,
  });

  const activeVisibleExercises = useMemo(() => {
    const orderById = previewOrderIds
      ? new Map(previewOrderIds.map((exerciseId, index) => [exerciseId, index]))
      : null;
    const orderedExercises = orderById
      ? [...visibleExercises].sort(
          (firstExercise, secondExercise) =>
            (orderById.get(firstExercise.id) ?? Number.POSITIVE_INFINITY) -
            (orderById.get(secondExercise.id) ?? Number.POSITIVE_INFINITY),
        )
      : visibleExercises;

    return orderedExercises.map((exercise) => {
      const program = programsByExercise.get(exercise.id) ?? null;
      const resolvedStatus = resolveExerciseStatus(exercise, program);
      return buildVisibleExerciseCard(exercise, program, resolvedStatus);
    });
  }, [previewOrderIds, programsByExercise, resolveExerciseStatus, visibleExercises]);

  return {
    query,
    setQuery,
    isManualMode,
    visibleExercises: activeVisibleExercises,
    pendingDrag,
    dragState,
    dragOverlayRef,
    listRef,
    setCardRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
