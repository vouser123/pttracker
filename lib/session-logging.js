// lib/session-logging.js — session log payload shaping and shared transport helpers

export function getPatternFlags(exercise) {
  const modifiers = exercise?.pattern_modifiers ?? [];
  const dosageType = exercise?.dosage_type ?? null;
  return {
    hasHold: modifiers.includes('hold_seconds') || dosageType === 'hold',
    hasDuration: modifiers.includes('duration_seconds') || dosageType === 'duration',
    hasDistance: modifiers.includes('distance_feet') || dosageType === 'distance',
    isSided: exercise?.pattern === 'side',
  };
}

export function inferActivityType(exercise) {
  const { hasHold, hasDuration, hasDistance } = getPatternFlags(exercise);
  if (hasDistance) return 'distance';
  if (hasDuration) return 'duration';
  if (hasHold) return 'hold';
  return 'reps';
}

export function nextMutationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `mut-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDefaultSet(exercise, setNumber) {
  const { hasHold, hasDuration, hasDistance, isSided } = getPatternFlags(exercise);
  const defaultFormData =
    Array.isArray(exercise?.default_form_data) && exercise.default_form_data.length > 0
      ? exercise.default_form_data.map((param) => ({ ...param }))
      : null;
  return {
    set_number: setNumber,
    reps: hasDuration ? 1 : (exercise?.current_reps ?? 1),
    seconds: hasDuration
      ? (exercise?.seconds_per_set ?? 30)
      : hasHold
        ? (exercise?.seconds_per_rep ?? 10)
        : null,
    distance_feet: hasDistance ? (exercise?.distance_feet ?? 20) : null,
    side: isSided ? 'right' : null,
    form_data: defaultFormData,
    manual_log: true,
    partial_rep: false,
    performed_at: new Date().toISOString(),
  };
}

export function normalizeSet(set, index, activityType = 'reps') {
  let reps = set?.reps ?? null;
  if (activityType === 'duration') reps = 1;
  if (activityType === 'distance') reps = null;

  return {
    set_number: set?.set_number ?? index + 1,
    reps,
    seconds: set?.seconds ?? null,
    distance_feet: set?.distance_feet ?? null,
    side: set?.side ?? null,
    form_data: Array.isArray(set?.form_data) && set.form_data.length > 0 ? set.form_data : null,
    manual_log: set?.manual_log ?? true,
    partial_rep: set?.partial_rep ?? false,
    performed_at: set?.performed_at ?? new Date().toISOString(),
  };
}

export function buildCreatePayload(exercise, performedAt, notes, sets) {
  const activityType = inferActivityType(exercise);
  return {
    exercise_id: exercise.id,
    exercise_name: exercise.canonical_name,
    activity_type: activityType,
    notes: notes || null,
    performed_at: performedAt,
    client_mutation_id: nextMutationId(),
    sets: sets.map((set, index) => normalizeSet(set, index, activityType)),
  };
}

export function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function isSessionLogNetworkFailure(error) {
  return error instanceof Error && /failed to fetch/i.test(error.message);
}

export async function createSessionLog(accessToken, payload) {
  const createRes = await fetch('/api/logs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (createRes.status !== 409 && !createRes.ok) {
    throw new Error(`Failed to create log (${createRes.status})`);
  }
}

export function buildQueuedSessionLogPayload(exercise, performedAt, notes, sets) {
  const activityType = inferActivityType(exercise);
  const normalizedSets = sets.map((set, index) => normalizeSet(set, index, activityType));
  const queuedPayload = {
    exercise_id: exercise.id,
    exercise_name: exercise.canonical_name,
    activity_type: activityType,
    notes: notes || null,
    performed_at: performedAt,
    sets: normalizedSets,
  };

  Object.assign(queuedPayload, buildCreatePayload(exercise, performedAt, notes, normalizedSets));

  return queuedPayload;
}
