// lib/program-assignment-optimistic.js — pure optimistic-state helpers for patient program assignment mutations

import { inferDosageType } from './program-optimistic.js';

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
