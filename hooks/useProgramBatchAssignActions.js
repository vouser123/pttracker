// hooks/useProgramBatchAssignActions.js — optimistic batch assignment enqueue helpers for /program

import { useCallback } from 'react';
import { applyOptimisticProgramAssignments } from '../lib/program-assignment-optimistic';
import { createProgramMutation, LOCAL_PROGRAM_ID_PREFIX } from '../lib/program-offline';

export function useProgramBatchAssignActions({
  session,
  programPatientId,
  enqueueMutation,
  getSnapshot,
}) {
  const handleBatchAssign = useCallback(
    async (assignments = []) => {
      if (!session?.user?.id || !programPatientId || assignments.length === 0) return;

      const previousSnapshot = getSnapshot();
      const exercisesById = new Map(
        (previousSnapshot.exercises ?? []).map((exercise) => [exercise.id, exercise]),
      );
      const mutationTimestamp = Date.now();

      await enqueueMutation(
        createProgramMutation('program.batch.assign', {
          patient_id: programPatientId,
          assignments,
        }),
        {
          ...previousSnapshot,
          programs: applyOptimisticProgramAssignments(previousSnapshot.programs, assignments, {
            exercisesById,
            patientId: programPatientId,
            createLocalProgramId: (exerciseId, index) =>
              `${LOCAL_PROGRAM_ID_PREFIX}${exerciseId}:${mutationTimestamp}-${index}`,
          }),
        },
        assignments.length === 1 ? 'Program assigned.' : `${assignments.length} programs assigned.`,
        previousSnapshot,
      );
    },
    [enqueueMutation, getSnapshot, programPatientId, session?.user?.id],
  );

  return { handleBatchAssign };
}
