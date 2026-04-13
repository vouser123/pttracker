// hooks/useExercisePickerModel.js — tracker exercise picker query, display shaping, and reorder orchestration
import { useMemo, useState } from 'react';
import { formatDosageSummary } from '../lib/dosage-summary';
import { isExercisePrn } from '../lib/exercise-lifecycle';
import { normalizeManualOrderIds, sortExercises } from '../lib/exercise-sort';
import { useExercisePickerManualReorder } from './useExercisePickerManualReorder';

function getAdherence(program) {
  if (program?.history_pending) return null;
  if (program?.adherence_text) {
    const suffix =
      program?.total_sessions > 0
        ? ` · ${program.total_sessions} session${program.total_sessions > 1 ? 's' : ''} total`
        : '';
    return {
      label: `${program.adherence_icon ?? ''}${program.adherence_text}${suffix}`,
      tone: program?.adherence_tone ?? 'gray',
    };
  }
  if (program?.adherence_status === 'done_today') {
    return { label: 'Done today', tone: 'green' };
  }
  if (program?.adherence_status === 'due_soon') {
    return { label: 'Due soon', tone: 'orange' };
  }
  if (program?.adherence_status === 'overdue') return { label: 'Overdue', tone: 'red' };
  if (program?.last_performed_at) {
    return { label: 'Recent activity', tone: 'green' };
  }
  return { label: 'No history', tone: 'gray' };
}

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

  const visibleExercises = useMemo(
    () =>
      sortExercises({
        exercises,
        programsByExercise,
        sortMode,
        lifecycleFilter,
        query,
        manualOrderIds,
      }),
    [exercises, lifecycleFilter, manualOrderIds, programsByExercise, query, sortMode],
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
      const adherence = getAdherence(program);
      return {
        id: exercise.id,
        canonical_name: exercise.canonical_name,
        pt_category: exercise.pt_category ?? '',
        isPrn: isExercisePrn(exercise),
        dosageText: formatDosageSummary(program ?? exercise, {
          exercise,
          emptyLabel: 'No dosage set',
        }),
        dosageActionLabel: program ? 'Edit dosage' : 'Set dosage',
        adherenceLabel: adherence?.label ?? null,
        adherenceTone: adherence?.tone ?? 'gray',
      };
    });
  }, [previewOrderIds, programsByExercise, visibleExercises]);

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
