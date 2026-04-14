// lib/program-optimistic.js — pure optimistic-state helpers for /program editor mutations

import {
  buildExerciseLifecycle,
  compareExercisesByLifecycle,
  isExerciseArchived,
} from './exercise-lifecycle.js';

export function emptyReferenceData() {
  return { equipment: [], muscles: [], formParameters: [] };
}

export function uniqueValues(values) {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

export function buildOptimisticExercise(existingExercise, payload) {
  const lifecycle = buildExerciseLifecycle({
    lifecycle_status: payload.lifecycle_status,
    lifecycle_effective_start_date: payload.lifecycle_effective_start_date ?? null,
    lifecycle_effective_end_date: payload.lifecycle_effective_end_date ?? null,
  });

  return {
    ...existingExercise,
    id: payload.id,
    canonical_name: payload.canonical_name,
    description: payload.description,
    pt_category: payload.pt_category,
    pattern: payload.pattern,
    archived: isExerciseArchived({ lifecycle }),
    pattern_modifiers: payload.pattern_modifiers ?? [],
    equipment: payload.equipment ?? { required: [], optional: [] },
    primary_muscles: payload.primary_muscles ?? [],
    secondary_muscles: payload.secondary_muscles ?? [],
    form_parameters_required: payload.form_parameters_required ?? [],
    guidance: payload.guidance ?? {},
    lifecycle,
    supersedes: payload.supersedes_exercise_id ? [payload.supersedes_exercise_id] : null,
    updated_date: new Date().toISOString(),
    added_date: existingExercise?.added_date ?? new Date().toISOString(),
    roles: existingExercise?.roles ?? [],
  };
}

export function mergeReferenceData(referenceData, payload) {
  const requiredEquipment = payload.equipment?.required ?? [];
  const optionalEquipment = payload.equipment?.optional ?? [];
  const primaryMuscles = payload.primary_muscles ?? [];
  const secondaryMuscles = payload.secondary_muscles ?? [];
  const formParameters = payload.form_parameters_required ?? [];

  return {
    equipment: uniqueValues([
      ...(referenceData?.equipment ?? []),
      ...requiredEquipment,
      ...optionalEquipment,
    ]),
    muscles: uniqueValues([
      ...(referenceData?.muscles ?? []),
      ...primaryMuscles,
      ...secondaryMuscles,
    ]),
    formParameters: uniqueValues([...(referenceData?.formParameters ?? []), ...formParameters]),
    formParameterMetadata: referenceData?.formParameterMetadata ?? {},
  };
}

export function inferDosageType(formData, exercise) {
  if (formData.distance_feet) return 'distance';
  if (formData.seconds_per_set) return 'duration';
  if (exercise?.pattern_modifiers?.includes('duration_seconds')) return 'duration';
  if (formData.seconds_per_rep) return 'hold';
  return 'reps';
}

export function buildOptimisticProgramAssignment(
  existingProgram,
  assignment,
  { exercise = null, patientId, localProgramId },
) {
  return {
    ...(existingProgram ?? {}),
    ...assignment,
    id: existingProgram?.id ?? localProgramId,
    patient_id: patientId,
    exercise_id: assignment.exercise_id,
    dosage_type: inferDosageType(assignment, exercise),
    assignment_status:
      assignment.assignment_status ?? existingProgram?.assignment_status ?? 'active',
    effective_start_date:
      assignment.effective_start_date ?? existingProgram?.effective_start_date ?? null,
    effective_end_date:
      assignment.effective_end_date ?? existingProgram?.effective_end_date ?? null,
  };
}

export function applyOptimisticProgramAssignments(
  programs,
  assignments,
  { exercisesById = new Map(), patientId, createLocalProgramId },
) {
  const nextPrograms = { ...(programs ?? {}) };

  for (const [index, assignment] of (assignments ?? []).entries()) {
    if (!assignment?.exercise_id) continue;
    const exerciseId = assignment.exercise_id;
    nextPrograms[exerciseId] = buildOptimisticProgramAssignment(
      nextPrograms[exerciseId],
      assignment,
      {
        exercise: exercisesById.get(exerciseId) ?? null,
        patientId,
        localProgramId: createLocalProgramId(exerciseId, index),
      },
    );
  }

  return nextPrograms;
}

export function applyOptimisticProgramUpdates(programs, programIds, updates) {
  const targetIds = new Set(programIds ?? []);
  if (targetIds.size === 0) return programs ?? {};

  return Object.fromEntries(
    Object.entries(programs ?? {}).map(([exerciseId, program]) => [
      exerciseId,
      targetIds.has(program?.id) ? { ...program, ...updates } : program,
    ]),
  );
}

export function sortExercisesForProgramEditor(exercises = []) {
  return [...exercises].sort(compareExercisesByLifecycle);
}
