// lib/tracker-exercise-context.js — pure tracker exercise form-context enrichment from logs and draft session state
import {
  buildDefaultFormDataForExercise,
  collectParameterValuesForExercise,
} from './session-form-params';

export function buildTrackerExerciseFormContext({ exercise, allLogs, draftSession, side = null }) {
  if (!exercise) return null;

  const sessionSets = draftSession?.exerciseId === exercise.id ? (draftSession.sets ?? []) : [];
  const scopedSide = exercise.pattern === 'side' ? (side ?? 'right') : null;

  return {
    ...exercise,
    default_form_data: buildDefaultFormDataForExercise(exercise, allLogs, {
      side: scopedSide,
      sessionSets,
    }),
    historical_form_params:
      exercise.pattern === 'side'
        ? {
            left: collectParameterValuesForExercise(
              allLogs,
              exercise.id,
              exercise.form_parameters_required ?? [],
              { side: 'left', sessionSets },
            ),
            right: collectParameterValuesForExercise(
              allLogs,
              exercise.id,
              exercise.form_parameters_required ?? [],
              { side: 'right', sessionSets },
            ),
          }
        : collectParameterValuesForExercise(
            allLogs,
            exercise.id,
            exercise.form_parameters_required ?? [],
            { sessionSets },
          ),
  };
}
