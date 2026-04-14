// hooks/useProgramBatchEditActions.js — optimistic batch assignment edit enqueue helpers for /program

import { useCallback } from 'react';
import { createProgramMutation } from '../lib/program-offline';
import { applyOptimisticProgramUpdates } from '../lib/program-optimistic';

export function useProgramBatchEditActions({
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

  const handleBatchDateUpdate = useCallback(
    async (programIds = [], updates = {}) => {
      if (!session?.user?.id || !programPatientId || programIds.length === 0) return;

      const previousSnapshot = getSnapshot();
      const payload = {
        patient_id: programPatientId,
        program_ids: programIds,
      };
      const optimisticUpdates = {};

      if (Object.hasOwn(updates, 'effective_start_date')) {
        payload.effective_start_date = updates.effective_start_date;
        optimisticUpdates.effective_start_date = updates.effective_start_date;
      }
      if (Object.hasOwn(updates, 'effective_end_date')) {
        payload.effective_end_date = updates.effective_end_date;
        optimisticUpdates.effective_end_date = updates.effective_end_date;
      }
      if (Object.keys(optimisticUpdates).length === 0) return;

      await enqueueMutation(
        createProgramMutation('program.batch.dates', payload),
        {
          ...previousSnapshot,
          programs: applyOptimisticProgramUpdates(
            previousSnapshot.programs,
            programIds,
            optimisticUpdates,
          ),
        },
        programIds.length === 1
          ? 'Assignment dates updated.'
          : `Assignment dates updated for ${programIds.length} programs.`,
        previousSnapshot,
      );
    },
    [enqueueMutation, getSnapshot, programPatientId, session?.user?.id],
  );

  return {
    handleBatchStatusUpdate,
    handleBatchDateUpdate,
  };
}
