// hooks/useProgramMutationQueueActions.js — enqueue-time optimistic save and rollback for /program mutations
import { useCallback } from 'react';
import {
  isNetworkError,
  markProgramMutationFailed,
  mergeProgramMutationQueue,
  performProgramMutation,
} from '../lib/program-offline';

export function useProgramMutationQueueActions({
  session,
  queueRef,
  persistQueue,
  commitSnapshot,
  loadData,
  showToast,
  setQueueError,
  syncProgramMutations,
  claimSyncLock,
  releaseSyncLock,
}) {
  return useCallback(
    async (mutation, nextSnapshot, successMessage, previousSnapshot) => {
      const nextQueue = mergeProgramMutationQueue(queueRef.current, mutation);
      const shouldAttemptImmediateSave = Boolean(
        session?.access_token && session?.user?.id && navigator.onLine && nextQueue.length === 1,
      );
      let syncLockClaimed = false;

      commitSnapshot(nextSnapshot);

      if (shouldAttemptImmediateSave) {
        // Claim the sync lock before queue state updates so the queue-length
        // effect cannot replay this same mutation concurrently.
        claimSyncLock();
        syncLockClaimed = true;
      }

      await persistQueue(nextQueue);

      if (!session?.access_token || !session?.user?.id || !navigator.onLine) {
        if (syncLockClaimed) releaseSyncLock();
        setQueueError('Offline - changes will sync later');
        showToast('Offline - changes will sync later', 'error');
        return;
      }

      if (nextQueue.length > 1) {
        if (syncLockClaimed) releaseSyncLock();
        syncProgramMutations();
        return;
      }

      try {
        await performProgramMutation(session.access_token, mutation);
        await persistQueue([]);
        setQueueError(null);
        await loadData(session.access_token, session.user.id);
        showToast(successMessage);
      } catch (error) {
        if (isNetworkError(error)) {
          const failedQueue = markProgramMutationFailed(
            nextQueue,
            mutation.id,
            'Offline - changes will sync later',
          );
          await persistQueue(failedQueue);
          setQueueError('Offline - changes will sync later');
          showToast('Offline - changes will sync later', 'error');
          return;
        }

        await persistQueue(nextQueue.filter((item) => item.id !== mutation.id));
        commitSnapshot(previousSnapshot);
        throw error;
      } finally {
        if (syncLockClaimed) releaseSyncLock();
      }
    },
    [
      claimSyncLock,
      commitSnapshot,
      loadData,
      persistQueue,
      queueRef,
      releaseSyncLock,
      session?.access_token,
      session?.user?.id,
      setQueueError,
      showToast,
      syncProgramMutations,
    ],
  );
}
