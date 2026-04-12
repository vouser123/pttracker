// lib/tracker-dosage-optimistic.js — optimistic program state for tracker dosage edits

import { LOCAL_PROGRAM_ID_PREFIX } from './program-offline';
import { inferDosageType } from './program-optimistic';

/**
 * Build an optimistic program record from a dosage form submission.
 * Used to reflect queued (unsynced) changes immediately in the tracker UI.
 */
export function buildOptimisticProgram(program, exercise, formData, patientId) {
  return {
    ...(program ?? {}),
    id: program?.id ?? `${LOCAL_PROGRAM_ID_PREFIX}${exercise.id}`,
    exercise_id: exercise.id,
    patient_id: patientId,
    dosage_type: inferDosageType(formData, exercise),
    sets: formData.sets,
    reps_per_set: formData.reps_per_set ?? null,
    seconds_per_rep: formData.seconds_per_rep ?? null,
    seconds_per_set: formData.seconds_per_set ?? null,
    distance_feet: formData.distance_feet ?? null,
    exercises: program?.exercises ?? exercise,
  };
}

/**
 * Merge queued dosage upserts into the current programs list optimistically.
 * Queued mutations are applied in order so the UI reflects pending changes.
 */
export function applyQueuedProgramUpserts(programs, queue, exercisesById, patientId) {
  const nextPrograms = new Map((programs ?? []).map((p) => [p.exercise_id, p]));

  for (const mutation of queue ?? []) {
    if (mutation?.type !== 'program.upsert') continue;
    if (patientId && mutation.payload?.payload?.patient_id !== patientId) continue;

    const exerciseId = mutation.payload?.exercise_id;
    if (!exerciseId) continue;

    const exercise =
      exercisesById.get(exerciseId) ?? nextPrograms.get(exerciseId)?.exercises ?? null;
    if (!exercise) continue;

    nextPrograms.set(
      exerciseId,
      buildOptimisticProgram(
        nextPrograms.get(exerciseId) ?? null,
        exercise,
        mutation.payload.payload,
        mutation.payload.payload.patient_id,
      ),
    );
  }

  return Array.from(nextPrograms.values());
}
