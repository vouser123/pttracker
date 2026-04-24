const EXERCISE_LIFECYCLE_ORDER = ['active', 'on_hold', 'as_needed', 'archived', 'deprecated'];
const EXERCISE_LIFECYCLE_SET = new Set(EXERCISE_LIFECYCLE_ORDER);

export const EXERCISE_LIFECYCLE_STATUSES = [...EXERCISE_LIFECYCLE_ORDER];

function normalizeLifecycleStatus(value: string): string {
  return EXERCISE_LIFECYCLE_SET.has(value) ? value : 'active';
}

export function getExerciseLifecycleStatus(exercise: any): string {
  const status = exercise?.lifecycle?.status ?? exercise?.lifecycle_status;
  if (status) return normalizeLifecycleStatus(status);
  if (exercise?.archived) return 'archived';
  return 'active';
}

export function isExerciseRoutine(exercise: any): boolean {
  return getExerciseLifecycleStatus(exercise) === 'active';
}

export function isExerciseOnHold(exercise: any): boolean {
  return getExerciseLifecycleStatus(exercise) === 'on_hold';
}

export function isExercisePrn(exercise: any): boolean {
  return getExerciseLifecycleStatus(exercise) === 'as_needed';
}

export function isExerciseArchived(exercise: any): boolean {
  return getExerciseLifecycleStatus(exercise) === 'archived';
}

export function isExerciseDeprecated(exercise: any): boolean {
  return getExerciseLifecycleStatus(exercise) === 'deprecated';
}

function lifecycleRank(exercise: any): number {
  return EXERCISE_LIFECYCLE_ORDER.indexOf(getExerciseLifecycleStatus(exercise));
}

export function compareExercisesByLifecycle(a: any, b: any): number {
  const byLifecycle = lifecycleRank(a) - lifecycleRank(b);
  if (byLifecycle !== 0) return byLifecycle;
  return (a?.canonical_name ?? '').localeCompare(b?.canonical_name ?? '');
}

export function buildExerciseLifecycle(exercise: any) {
  return {
    status: getExerciseLifecycleStatus(exercise),
    effective_start_date:
      exercise?.lifecycle?.effective_start_date ?? exercise?.lifecycle_effective_start_date ?? null,
    effective_end_date:
      exercise?.lifecycle?.effective_end_date ?? exercise?.lifecycle_effective_end_date ?? null,
  };
}
