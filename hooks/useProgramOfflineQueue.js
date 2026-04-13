// hooks/useProgramOfflineQueue.js — offline queue state owner for the /program editor

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadProgramQueue, saveProgramQueue, summarizeProgramQueue } from '../lib/program-offline';
import { useProgramMutationQueueActions } from './useProgramMutationQueueActions';
import { useProgramQueueSync } from './useProgramQueueSync';

export function useProgramOfflineQueue({
  session,
  programPatientId,
  loadData,
  showToast,
  commitSnapshot,
}) {
  const [mutationQueue, setMutationQueue] = useState([]);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [queueError, setQueueError] = useState(null);
  const queueRef = useRef([]);
  const queueSummary = summarizeProgramQueue(mutationQueue);

  const persistQueue = useCallback(
    async (nextQueue) => {
      queueRef.current = nextQueue;
      setMutationQueue(nextQueue);
      if (session?.user?.id) {
        await saveProgramQueue(session.user.id, nextQueue);
      }
    },
    [session?.user?.id],
  );

  const { queueSyncing, syncProgramMutations, claimSyncLock, releaseSyncLock } =
    useProgramQueueSync({
      session,
      programPatientId,
      mutationQueue,
      queueLoaded,
      queueRef,
      persistQueue,
      loadData,
      showToast,
      setQueueError,
    });

  const enqueueMutation = useProgramMutationQueueActions({
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
  });

  useEffect(() => {
    let cancelled = false;

    if (!session?.user?.id) {
      queueRef.current = [];
      setMutationQueue([]);
      setQueueLoaded(false);
      setQueueError(null);
      return () => {
        cancelled = true;
      };
    }

    loadProgramQueue(session.user.id)
      .then((queue) => {
        if (cancelled) return;

        queueRef.current = queue;
        setMutationQueue(queue);
        setQueueLoaded(true);
        setQueueError(summarizeProgramQueue(queue).firstFailed?.last_error ?? null);
      })
      .catch(() => {
        if (cancelled) return;

        queueRef.current = [];
        setMutationQueue([]);
        setQueueLoaded(true);
        setQueueError(null);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return {
    mutationQueue,
    queueSummary,
    queueError,
    queueLoaded,
    queueSyncing,
    enqueueMutation,
    persistQueue,
    syncProgramMutations,
  };
}
