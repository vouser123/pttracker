// hooks/useProgramBatchStatusActions.js — optimistic batch assignment status enqueue helpers for /program

import { useCallback } from 'react';
import { applyOptimisticProgramUpdates } from '../lib/program-assignment-optimistic';
import { createProgramMutation } from '../lib/program-offline';

export function useProgramBatchStatusActions({
  session,
  programPatientId,
  enqueueMutation,
  getSnapshot,
}) {
  const handleBatchStatusUpdate = useCallback(
    async (programIds = [], assignmentStatus) => {
      if (!session?.user?.id || !programPatientId || programIds.length === 0 || !assignmentStatus) {
        return;
      }

      const previousSnapshot = getSnapshot();

      await enqueueMutation(
        createProgramMutation('program.batch.status', {
          patient_id: programPatientId,
          program_ids: programIds,
          assignment_status: assignmentStatus,
        }),
        {
          ...previousSnapshot,
          programs: applyOptimisticProgramUpdates(previousSnapshot.programs, programIds, {
            assignment_status: assignmentStatus,
          }),
        },
        programIds.length === 1
          ? 'Assignment status updated.'
          : `Assignment status updated for ${programIds.length} programs.`,
        previousSnapshot,
      );
    },
    [enqueueMutation, getSnapshot, programPatientId, session?.user?.id],
  );

  return { handleBatchStatusUpdate };
}
