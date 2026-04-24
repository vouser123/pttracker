const EXERCISE_LIFECYCLE_ORDER = ['active', 'on_hold', 'as_needed', 'archived', 'deprecated'];
const EXERCISE_LIFECYCLE_SET = new Set(EXERCISE_LIFECYCLE_ORDER);

export const EXERCISE_LIFECYCLE_STATUSES = [...EXERCISE_LIFECYCLE_ORDER];

export type ExerciseLifecycleStatus =
  | 'active'
  | 'on_hold'
  | 'as_needed'
  | 'archived'
  | 'deprecated';

export interface ExerciseWithLifecycle {
  lifecycle?: {
    status?: string;
    effective_start_date?: string | null;
    effective_end_date?: string | null;
  };
  lifecycle_status?: string;
  lifecycle_effective_start_date?: string | null;
  lifecycle_effective_end_date?: string | null;
  archived?: boolean;
  canonical_name?: string;
  id?: string;
}

function normalizeLifecycleStatus(value: string): ExerciseLifecycleStatus {
  return EXERCISE_LIFECYCLE_SET.has(value) ? (value as ExerciseLifecycleStatus) : 'active';
}

export function getExerciseLifecycleStatus(
  exercise: ExerciseWithLifecycle | null | undefined,
): ExerciseLifecycleStatus {
  const status = exercise?.lifecycle?.status ?? exercise?.lifecycle_status;
  if (status) return normalizeLifecycleStatus(status);
  if (exercise?.archived) return 'archived';
  return 'active';
}

export function isExerciseRoutine(exercise: ExerciseWithLifecycle | null | undefined): boolean {
  return getExerciseLifecycleStatus(exercise) === 'active';
}

export function isExerciseOnHold(exercise: ExerciseWithLifecycle | null | undefined): boolean {
  return getExerciseLifecycleStatus(exercise) === 'on_hold';
}

export function isExercisePrn(exercise: ExerciseWithLifecycle | null | undefined): boolean {
  return getExerciseLifecycleStatus(exercise) === 'as_needed';
}

export function isExerciseArchived(exercise: ExerciseWithLifecycle | null | undefined): boolean {
  return getExerciseLifecycleStatus(exercise) === 'archived';
}

export function isExerciseDeprecated(exercise: ExerciseWithLifecycle | null | undefined): boolean {
  return getExerciseLifecycleStatus(exercise) === 'deprecated';
}

function lifecycleRank(exercise: ExerciseWithLifecycle | null | undefined): number {
  return EXERCISE_LIFECYCLE_ORDER.indexOf(getExerciseLifecycleStatus(exercise));
}

export function compareExercisesByLifecycle(
  a: ExerciseWithLifecycle | null | undefined,
  b: ExerciseWithLifecycle | null | undefined,
): number {
  const byLifecycle = lifecycleRank(a) - lifecycleRank(b);
  if (byLifecycle !== 0) return byLifecycle;
  return (a?.canonical_name ?? '').localeCompare(b?.canonical_name ?? '');
}

export function buildExerciseLifecycle(exercise: ExerciseWithLifecycle | null | undefined) {
  return {
    status: getExerciseLifecycleStatus(exercise),
    effective_start_date:
      exercise?.lifecycle?.effective_start_date ?? exercise?.lifecycle_effective_start_date ?? null,
    effective_end_date:
      exercise?.lifecycle?.effective_end_date ?? exercise?.lifecycle_effective_end_date ?? null,
  };
}
