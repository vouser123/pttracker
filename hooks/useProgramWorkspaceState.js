// hooks/useProgramWorkspaceState.js — /program editor workspace state and derived selections
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  compareExercisesByLifecycle,
  isExerciseArchived,
  isExerciseDeprecated,
} from '../lib/exercise-lifecycle';

function matchesSearch(exercise, search) {
  return !search || exercise.canonical_name.toLowerCase().includes(search.toLowerCase());
}

function applyFilters(exercises, search, showArchived, selectedId) {
  return exercises.filter((exercise) => {
    if (isExerciseDeprecated(exercise)) return false;
    if (!showArchived && isExerciseArchived(exercise) && exercise.id !== selectedId) return false;
    if (!matchesSearch(exercise, search)) return false;
    return true;
  }).sort(compareExercisesByLifecycle);
}

function filterWorkspaceOptions(exercises, selectedId, search) {
  return exercises.filter((exercise) => {
    if (isExerciseDeprecated(exercise)) return false;
    if (isExerciseArchived(exercise) && exercise.id !== selectedId) return false;
    if (!matchesSearch(exercise, search)) return false;
    return true;
  }).sort(compareExercisesByLifecycle);
}

/**
 * Page-local /program workspace state.
 * @param {{ exercises: object[], programs: object, enabled: boolean }} params
 * @returns {object}
 */
export function useProgramWorkspaceState({ exercises, programs, enabled }) {
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [dosageSearch, setDosageSearch] = useState('');
  const [activeExercise, setActiveExercise] = useState(null);
  const [roleExerciseId, setRoleExerciseId] = useState('');
  const [dosageExerciseId, setDosageExerciseId] = useState('');
  const [dosageTarget, setDosageTarget] = useState(null);

  useEffect(() => {
    if (!activeExercise || activeExercise === 'new') return;
    const refreshedExercise = exercises.find((exercise) => exercise.id === activeExercise.id);
    if (refreshedExercise && refreshedExercise !== activeExercise) {
      setActiveExercise(refreshedExercise);
    }
  }, [activeExercise, exercises]);

  const handleCancel = useCallback(() => setActiveExercise(null), []);
  const handleSelectExercise = useCallback((exerciseId) => {
    setActiveExercise(exercises.find((exercise) => exercise.id === exerciseId) ?? null);
  }, [exercises]);

  const filtered = useMemo(
    () => (enabled ? applyFilters(exercises, search, showArchived, activeExercise?.id ?? null) : []),
    [activeExercise?.id, enabled, exercises, search, showArchived]
  );
  const roleExerciseOptions = useMemo(() => (enabled ? filterWorkspaceOptions(exercises, roleExerciseId, roleSearch) : []), [enabled, exercises, roleExerciseId, roleSearch]);
  const dosageExerciseOptions = useMemo(() => (enabled ? filterWorkspaceOptions(exercises, dosageExerciseId, dosageSearch) : []), [enabled, exercises, dosageExerciseId, dosageSearch]);
  const formExercise = activeExercise === 'new' ? null : activeExercise;
  const roleExercise = exercises.find((exercise) => exercise.id === roleExerciseId) ?? null;
  const dosageExercise = exercises.find((exercise) => exercise.id === dosageExerciseId) ?? null;
  const selectedProgram = dosageExercise ? (programs[dosageExercise.id] ?? null) : null;

  return {
    search,
    showArchived,
    roleSearch,
    dosageSearch,
    activeExercise,
    roleExerciseId,
    dosageExerciseId,
    dosageTarget,
    filtered,
    roleExerciseOptions,
    dosageExerciseOptions,
    formExercise,
    roleExercise,
    dosageExercise,
    selectedProgram,
    setSearch,
    setShowArchived,
    setRoleSearch,
    setDosageSearch,
    setActiveExercise,
    setRoleExerciseId,
    setDosageExerciseId,
    setDosageTarget,
    handleCancel,
    handleSelectExercise,
  };
}
