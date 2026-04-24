import {
  compareExercisesByLifecycle,
  isExerciseArchived,
  isExerciseDeprecated,
  isExerciseOnHold,
  isExercisePrn,
} from './exercise-lifecycle';

export function formatExerciseLifecycleLabel(exercise: any): string {
  const prefixes = [];
  if (isExerciseArchived(exercise)) prefixes.push('[archived]');
  if (isExerciseOnHold(exercise)) prefixes.push('[On Hold]');
  if (isExercisePrn(exercise)) prefixes.push('[PRN]');
  const prefix = prefixes.length > 0 ? `${prefixes.join(' ')} ` : '';
  return `${prefix}${exercise?.canonical_name ?? ''}`;
}

export function buildGroupedLifecycleOptions(exercises: any[] = []) {
  const visibleExercises = exercises
    .filter((exercise: any) => !isExerciseDeprecated(exercise))
    .sort(compareExercisesByLifecycle);

  const activeOptions = [];
  const onHoldOptions = [];
  const prnOptions = [];
  const archivedOptions = [];

  for (const exercise of visibleExercises) {
    const option = {
      value: exercise.id,
      label: formatExerciseLifecycleLabel(exercise),
    };
    if (isExerciseOnHold(exercise)) {
      onHoldOptions.push(option);
    } else if (isExercisePrn(exercise)) {
      prnOptions.push(option);
    } else if (isExerciseArchived(exercise)) {
      archivedOptions.push(option);
    } else {
      activeOptions.push(option);
    }
  }

  return [
    ...activeOptions,
    ...(onHoldOptions.length > 0
      ? [
          { value: '__on_hold_separator__', label: '──────── On Hold ────────', disabled: true },
          ...onHoldOptions,
        ]
      : []),
    ...(prnOptions.length > 0
      ? [
          { value: '__prn_separator__', label: '──────── PRN ────────', disabled: true },
          ...prnOptions,
        ]
      : []),
    ...archivedOptions,
  ];
}
