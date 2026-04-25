// lib/programs-utils.js — Shared utility functions for program dosage logic.
// Extracted from lib/handlers/programs.js so they remain available after the
// Pages-style handler is replaced by the App Router route handler.

import { buildExerciseLifecycle } from './exercise-lifecycle';

/**
 * Resolve the effective dosage_type for a program record.
 * Falls back to inferring from available numeric fields if dosage_type is not set.
 */
export function resolveProgramDosageType({
  dosage_type,
  distance_feet,
  seconds_per_set,
  seconds_per_rep,
  fallback = 'reps',
}) {
  return (
    dosage_type ||
    (distance_feet
      ? 'distance'
      : seconds_per_set
        ? 'duration'
        : seconds_per_rep
          ? 'hold'
          : fallback)
  );
}

/**
 * Returns true if a dosage type requires a reps_per_set value.
 * Duration and distance modes don't use rep counts.
 */
export function dosageTypeRequiresReps(dosageType) {
  return !['duration', 'distance'].includes(dosageType);
}

/**
 * Normalize program data, transforming nested Supabase relations into flat arrays.
 *
 * IMPORTANT: Always prefer formParamsByExercise (loaded via admin client) over the
 * nested query result, since RLS may block patients from reading exercise_form_parameters
 * via the nested join, causing it to silently return [].
 */
export function normalizeProgramPatternModifiers(programs, formParamsByExercise = {}) {
  return programs.map((program) => {
    const exercise = program.exercises || null;
    const modifiers = exercise?.exercise_pattern_modifiers || [];
    const nestedFormParams = exercise?.exercise_form_parameters || [];
    const nestedEquipment = exercise?.exercise_equipment || [];
    const nestedMuscles = exercise?.exercise_muscles || [];
    const nestedGuidance = exercise?.exercise_guidance || [];

    const {
      exercise_form_parameters,
      exercise_pattern_modifiers,
      exercise_equipment,
      exercise_muscles,
      exercise_guidance,
      ...exercisePayload
    } = exercise || {};

    const adminFormParams = exercise?.id ? formParamsByExercise[exercise.id] || [] : [];
    const resolvedFormParams = adminFormParams.length > 0 ? adminFormParams : nestedFormParams;

    const equipment = {
      required: nestedEquipment.filter((e) => e.is_required).map((e) => e.equipment_name),
      optional: nestedEquipment.filter((e) => !e.is_required).map((e) => e.equipment_name),
    };

    const primary_muscles = nestedMuscles.filter((m) => m.is_primary).map((m) => m.muscle_name);
    const secondary_muscles = nestedMuscles.filter((m) => !m.is_primary).map((m) => m.muscle_name);

    const guidance = {
      motor_cues: nestedGuidance
        .filter((g) => g.section === 'motor_cues')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((g) => g.content),
      compensation_warnings: nestedGuidance
        .filter((g) => g.section === 'compensation_warnings')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((g) => g.content),
      safety_flags: nestedGuidance
        .filter((g) => g.section === 'safety_flags')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((g) => g.content),
      external_cues: nestedGuidance
        .filter((g) => g.section === 'external_cues')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((g) => g.content),
    };

    return {
      ...program,
      exercises: exercise
        ? {
            ...exercisePayload,
            lifecycle: buildExerciseLifecycle(exercise),
            pattern_modifiers: modifiers.map((modifier) => modifier.modifier),
            form_parameters_required: resolvedFormParams.map((param) => param.parameter_name),
            equipment,
            primary_muscles,
            secondary_muscles,
            guidance,
          }
        : exercise,
    };
  });
}
