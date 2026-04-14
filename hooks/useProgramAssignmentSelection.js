// hooks/useProgramAssignmentSelection.js — multi-select exercise state for the batch assignment workspace
import { useCallback, useState } from 'react';

/**
 * Pure selection-state hook for the program batch assignment workspace.
 *
 * SRP: owns only the selected exercise ID set. Has no knowledge of API calls,
 * data loading, or mutation logic — those belong in separate hooks.
 *
 * @returns {{
 *   selectedExerciseIds: Set<string>,
 *   toggleExercise: (id: string) => void,
 *   selectAll: (ids: string[]) => void,
 *   clearAll: () => void,
 * }}
 */
export function useProgramAssignmentSelection() {
  const [selectedExerciseIds, setSelectedExerciseIds] = useState(() => new Set());

  const toggleExercise = useCallback((id) => {
    setSelectedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids) => {
    setSelectedExerciseIds(new Set(ids));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedExerciseIds(new Set());
  }, []);

  return { selectedExerciseIds, toggleExercise, selectAll, clearAll };
}
