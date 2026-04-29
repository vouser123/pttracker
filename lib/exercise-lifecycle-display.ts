import {
  compareExercisesByLifecycle,
  type ExerciseWithLifecycle,
  isExerciseArchived,
  isExerciseDeprecated,
  isExerciseOnHold,
  isExercisePrn,
} from './exercise-lifecycle';

export interface ExerciseOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function formatExerciseLifecycleLabel(exercise: ExerciseWithLifecycle): string {
  const prefixes: string[] = [];
  if (isExerciseArchived(exercise)) prefixes.push('[archived]');
  if (isExerciseOnHold(exercise)) prefixes.push('[On Hold]');
  if (isExercisePrn(exercise)) prefixes.push('[PRN]');
  const prefix = prefixes.length > 0 ? `${prefixes.join(' ')} ` : '';
  return `${prefix}${exercise?.canonical_name ?? ''}`;
}

export function buildGroupedLifecycleOptions(
  exercises: ExerciseWithLifecycle[] = [],
): ExerciseOption[] {
  const visibleExercises = exercises
    .filter((exercise) => !isExerciseDeprecated(exercise))
    .sort(compareExercisesByLifecycle);

  const activeOptions: ExerciseOption[] = [];
  const onHoldOptions: ExerciseOption[] = [];
  const prnOptions: ExerciseOption[] = [];
  const archivedOptions: ExerciseOption[] = [];

  for (const exercise of visibleExercises) {
    const option: ExerciseOption = {
      value: exercise.id ?? '',
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
