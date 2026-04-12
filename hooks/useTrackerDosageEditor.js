// hooks/useTrackerDosageEditor.js — editor UI state for tracker dosage changes
import { useCallback, useMemo, useState } from 'react';
import {
  createProgramMutation,
  isNetworkError,
  markProgramMutationFailed,
  mergeProgramMutationQueue,
  performProgramMutation,
} from '../lib/program-offline';
import { applyQueuedProgramUpserts } from '../lib/tracker-dosage-optimistic';
import { useTrackerDosageQueue } from './useTrackerDosageQueue';

/**
 * Manages dosage editor state for tracker: open/close/save, optimistic display,
 * and offline queuing via useTrackerDosageQueue.
 */
export function useTrackerDosageEditor({
  session,
  userRole,
  trackerPatientId,
  exercises,
  programs,
  reload,
  showToast,
}) {
  const [dosageTarget, setDosageTarget] = useState(null);
  const canEditDosage = userRole !== 'patient';

  const { mutationQueue, dosageSyncing, dosageQueueError, persistQueue, syncQueue } =
    useTrackerDosageQueue({ session, onSynced: reload });

  const exercisesById = useMemo(
    () => new Map((exercises ?? []).map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  const programsForTracker = useMemo(
    () => applyQueuedProgramUpserts(programs, mutationQueue, exercisesById, trackerPatientId),
    [exercisesById, mutationQueue, programs, trackerPatientId],
  );

  const openDosageEditor = useCallback(
    (exerciseId) => {
      if (!canEditDosage) return;
      const exercise = exercisesById.get(exerciseId) ?? null;
      if (!exercise) return;
      const program = programsForTracker.find((item) => item.exercise_id === exerciseId) ?? null;
      setDosageTarget({ exercise, program });
    },
    [canEditDosage, exercisesById, programsForTracker],
  );

  const closeDosageEditor = useCallback(() => {
    setDosageTarget(null);
  }, []);

  const saveDosage = useCallback(
    async (formData) => {
      if (!session?.user?.id || !trackerPatientId || !dosageTarget?.exercise) {
        throw new Error('Unable to save dosage right now.');
      }

      const mutation = createProgramMutation('program.upsert', {
        exercise_id: dosageTarget.exercise.id,
        programId: dosageTarget.program?.id ?? null,
        payload: {
          ...formData,
          exercise_id: dosageTarget.exercise.id,
          patient_id: trackerPatientId,
        },
      });

      const previousQueue = mutationQueue;
      const nextQueue = mergeProgramMutationQueue(previousQueue, mutation);
      await persistQueue(nextQueue);

      if (!session?.access_token || !navigator.onLine) {
        setDosageTarget(null);
        // Banner shows persistent pending state — no toast needed
        return;
      }

      if (nextQueue.length > 1) {
        setDosageTarget(null);
        void syncQueue();
        return;
      }

      try {
        await performProgramMutation(session.access_token, mutation);
        await persistQueue(nextQueue.filter((item) => item.id !== mutation.id));
        await reload();
        setDosageTarget(null);
        showToast('Dosage saved.');
      } catch (error) {
        if (isNetworkError(error)) {
          const failedQueue = markProgramMutationFailed(
            nextQueue,
            mutation.id,
            'Network error — will retry when online',
          );
          await persistQueue(failedQueue);
          setDosageTarget(null);
          // Banner shows persistent error state — no toast needed
          return;
        }
        await persistQueue(previousQueue);
        throw error;
      }
    },
    [
      dosageTarget,
      mutationQueue,
      persistQueue,
      reload,
      session?.access_token,
      session?.user?.id,
      showToast,
      syncQueue,
      trackerPatientId,
    ],
  );

  return {
    canEditDosage,
    dosageTarget,
    programsForTracker,
    mutationQueue,
    dosageSyncing,
    dosageQueueError,
    openDosageEditor,
    closeDosageEditor,
    saveDosage,
  };
}
