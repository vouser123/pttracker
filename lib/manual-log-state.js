// lib/manual-log-state.js — pure manual-log set shaping, validation, and normalization helpers for tracker drafts
import { createDefaultSet, normalizeSet } from './session-logging';

export function createEmptyManualLogState() {
  return { isOpen: false, exercise: null, sets: [], error: null };
}

export function createOpenedManualLogState({ exercise, side, seedSet = null, performedAt }) {
  return {
    isOpen: true,
    exercise,
    sets: [
      createManualLogSeedSet({
        exercise,
        side,
        seedSet,
        performedAt,
      }),
    ],
    error: null,
  };
}

export function createManualLogSeedSet({ exercise, side, seedSet = null, performedAt }) {
  return {
    ...createDefaultSet(exercise, 1),
    ...(seedSet ?? {}),
    side: exercise?.pattern === 'side' ? side : null,
    manual_log: true,
    form_data: seedSet?.form_data ?? exercise?.default_form_data ?? null,
    performed_at: performedAt,
  };
}

export function appendManualLogSet(sets, exercise) {
  const currentSets = Array.isArray(sets) ? sets : [];
  return [...currentSets, createDefaultSet(exercise, currentSets.length + 1)];
}

export function removeManualLogSet(sets, indexToRemove) {
  return (Array.isArray(sets) ? sets : [])
    .filter((_, index) => index !== indexToRemove)
    .map((set, index) => ({ ...set, set_number: index + 1 }));
}

export function patchManualLogSet({ sets, index, patch, exercise, buildExerciseFormContext }) {
  const currentExercise = exercise ?? null;
  const nextExercise =
    patch.side && currentExercise?.pattern === 'side' && buildExerciseFormContext
      ? (buildExerciseFormContext(currentExercise, patch.side) ?? currentExercise)
      : currentExercise;

  const nextSets = (Array.isArray(sets) ? sets : []).map((set, setIndex) => {
    if (setIndex !== index) return set;
    const nextSet = { ...set, ...patch };
    if (patch.side && currentExercise?.pattern === 'side' && !patch.form_data) {
      return {
        ...nextSet,
        form_data: nextExercise?.default_form_data ?? nextSet.form_data ?? null,
      };
    }
    return nextSet;
  });

  return {
    exercise: nextExercise,
    sets: nextSets,
  };
}

export function updateManualLogFormParam({ sets, index, paramName, paramValue, paramUnit = null }) {
  return (Array.isArray(sets) ? sets : []).map((set, setIndex) => {
    if (setIndex !== index) return set;
    const existing = Array.isArray(set.form_data) ? [...set.form_data] : [];
    const matchIndex = existing.findIndex((item) => item.parameter_name === paramName);

    if (!paramValue) {
      const filtered = existing.filter((item) => item.parameter_name !== paramName);
      return { ...set, form_data: filtered.length > 0 ? filtered : null };
    }

    const nextParam = {
      parameter_name: paramName,
      parameter_value: paramValue,
      parameter_unit: paramUnit,
    };
    if (matchIndex >= 0) existing[matchIndex] = nextParam;
    else existing.push(nextParam);
    return { ...set, form_data: existing };
  });
}

export function getManualLogValidationError({ draftSession, sets }) {
  const currentSets = Array.isArray(sets) ? sets : [];
  if (currentSets.length === 0) {
    return 'Add at least one set before saving.';
  }

  if (
    draftSession?.activityType === 'hold' &&
    currentSets.some((set) => !Number(set.seconds ?? 0))
  ) {
    return 'Please enter seconds per rep';
  }

  return null;
}

export function normalizeManualLogSets({ sets, draftSession }) {
  const currentSets = Array.isArray(sets) ? sets : [];
  return currentSets.map((set, index) =>
    normalizeSet(
      {
        ...set,
        set_number: draftSession.sets.length + index + 1,
        performed_at: draftSession.date,
        manual_log: true,
      },
      draftSession.sets.length + index,
      draftSession.activityType,
    ),
  );
}

export function getManualComparisonSide(exercise, sets) {
  if (exercise?.pattern !== 'side') return null;

  const sides = [...new Set((sets ?? []).map((set) => set?.side).filter(Boolean))];
  return sides.length === 1 ? sides[0] : null;
}
