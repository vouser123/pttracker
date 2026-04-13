// lib/session-log-draft.js — pure draft-state helpers for session log modal sets
import { createDefaultSet, normalizeSet } from './session-logging';

export function buildCreateDraft(selectedExercise) {
  return {
    logId: null,
    performedAt: new Date().toISOString(),
    notes: '',
    sets: [createDefaultSet(selectedExercise, 1)],
  };
}

export function buildSeededCreateDraft(selectedExercise, seedPatch) {
  return {
    logId: null,
    performedAt: new Date().toISOString(),
    notes: '',
    sets: [
      {
        ...createDefaultSet(selectedExercise, 1),
        ...(seedPatch ?? {}),
        set_number: 1,
      },
    ],
  };
}

export function buildEditDraft(selectedExercise, log) {
  const nextSets = (log?.sets ?? []).map((set, index) => normalizeSet(set, index));

  return {
    logId: log?.id ?? null,
    performedAt: log?.performed_at ?? new Date().toISOString(),
    notes: log?.notes ?? '',
    sets: nextSets.length > 0 ? nextSets : [createDefaultSet(selectedExercise, 1)],
  };
}

export function appendDraftSet(sets, exercise) {
  return [...sets, createDefaultSet(exercise, sets.length + 1)];
}

export function removeDraftSetAtIndex(sets, index) {
  return sets
    .filter((_, itemIndex) => itemIndex !== index)
    .map((set, itemIndex) => ({ ...set, set_number: itemIndex + 1 }));
}

export function updateDraftSetAtIndex(sets, index, patch) {
  return sets.map((set, itemIndex) => (itemIndex === index ? { ...set, ...patch } : set));
}

export function updateDraftFormParamAtIndex(sets, index, paramName, paramValue, paramUnit = null) {
  return sets.map((set, itemIndex) => {
    if (itemIndex !== index) return set;

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

    if (matchIndex >= 0) {
      existing[matchIndex] = nextParam;
    } else {
      existing.push(nextParam);
    }

    return { ...set, form_data: existing };
  });
}
