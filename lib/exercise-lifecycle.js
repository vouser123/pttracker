const EXERCISE_LIFECYCLE_ORDER = ['active', 'as_needed', 'archived', 'deprecated'];
const EXERCISE_LIFECYCLE_SET = new Set(EXERCISE_LIFECYCLE_ORDER);

export const EXERCISE_LIFECYCLE_STATUSES = [...EXERCISE_LIFECYCLE_ORDER];

function normalizeLifecycleStatus(value) {
    return EXERCISE_LIFECYCLE_SET.has(value) ? value : 'active';
}

export function getExerciseLifecycleStatus(exercise) {
    const status = exercise?.lifecycle?.status ?? exercise?.lifecycle_status;
    if (status) return normalizeLifecycleStatus(status);
    if (exercise?.archived) return 'archived';
    return 'active';
}

export function isExerciseRoutine(exercise) {
    return getExerciseLifecycleStatus(exercise) === 'active';
}

export function isExercisePrn(exercise) {
    return getExerciseLifecycleStatus(exercise) === 'as_needed';
}

export function isExerciseArchived(exercise) {
    return getExerciseLifecycleStatus(exercise) === 'archived';
}

export function isExerciseDeprecated(exercise) {
    return getExerciseLifecycleStatus(exercise) === 'deprecated';
}

function lifecycleRank(exercise) {
    return EXERCISE_LIFECYCLE_ORDER.indexOf(getExerciseLifecycleStatus(exercise));
}

export function compareExercisesByLifecycle(a, b) {
    const byLifecycle = lifecycleRank(a) - lifecycleRank(b);
    if (byLifecycle !== 0) return byLifecycle;
    return (a?.canonical_name ?? '').localeCompare(b?.canonical_name ?? '');
}

export function formatExerciseLifecycleLabel(exercise) {
    const prefixes = [];
    if (isExerciseArchived(exercise)) prefixes.push('[archived]');
    if (isExercisePrn(exercise)) prefixes.push('[PRN]');
    const prefix = prefixes.length > 0 ? `${prefixes.join(' ')} ` : '';
    return `${prefix}${exercise?.canonical_name ?? ''}`;
}

export function buildGroupedLifecycleOptions(exercises = []) {
    const visibleExercises = exercises
        .filter((exercise) => !isExerciseDeprecated(exercise))
        .sort(compareExercisesByLifecycle);

    const activeOptions = [];
    const prnOptions = [];
    const archivedOptions = [];

    for (const exercise of visibleExercises) {
        const option = {
            value: exercise.id,
            label: formatExerciseLifecycleLabel(exercise),
        };
        if (isExercisePrn(exercise)) {
            prnOptions.push(option);
        } else if (isExerciseArchived(exercise)) {
            archivedOptions.push(option);
        } else {
            activeOptions.push(option);
        }
    }

    return [
        ...activeOptions,
        ...(prnOptions.length > 0
            ? [{ value: '__prn_separator__', label: '──────── PRN ────────', disabled: true }, ...prnOptions]
            : []),
        ...archivedOptions,
    ];
}

export function buildExerciseLifecycle(exercise) {
    return {
        status: getExerciseLifecycleStatus(exercise),
        effective_start_date: exercise?.lifecycle?.effective_start_date ?? exercise?.lifecycle_effective_start_date ?? null,
        effective_end_date: exercise?.lifecycle?.effective_end_date ?? exercise?.lifecycle_effective_end_date ?? null,
    };
}
