// hooks/useProgramQueueSync.js — replay and reconnect lifecycle for the /program offline queue
import { useCallback, useEffect, useRef, useState } from 'react';
import { replayProgramQueue } from '../lib/program-offline';

export function useProgramQueueSync({
  session,
  programPatientId,
  mutationQueue,
  queueLoaded,
  queueRef,
  persistQueue,
  loadData,
  showToast,
  setQueueError,
}) {
  const [queueSyncing, setQueueSyncing] = useState(false);
  const syncInFlightRef = useRef(false);

  const claimSyncLock = useCallback(() => {
    syncInFlightRef.current = true;
  }, []);

  const releaseSyncLock = useCallback(() => {
    syncInFlightRef.current = false;
  }, []);

  const syncProgramMutations = useCallback(async () => {
    if (
      !session?.access_token ||
      !session?.user?.id ||
      !programPatientId ||
      syncInFlightRef.current
    ) {
      return;
    }

    const currentQueue = queueRef.current;
    if (!currentQueue.length) {
      setQueueError(null);
      return;
    }

    syncInFlightRef.current = true;
    setQueueSyncing(true);
    setQueueError(null);

    try {
      const { failedMessage, syncedCount } = await replayProgramQueue(
        session.access_token,
        currentQueue,
        persistQueue,
      );

      if (failedMessage) {
        setQueueError(failedMessage);
        return;
      }

      if (syncedCount > 0) {
        await loadData(session.access_token, session.user.id, programPatientId);
        showToast(
          syncedCount === 1
            ? '1 pending program change synced.'
            : `${syncedCount} pending program changes synced.`,
        );
      }
    } finally {
      syncInFlightRef.current = false;
      setQueueSyncing(false);
    }
  }, [
    loadData,
    persistQueue,
    programPatientId,
    queueRef,
    session?.access_token,
    session?.user?.id,
    setQueueError,
    showToast,
  ]);

  useEffect(() => {
    if (
      !queueLoaded ||
      !session?.user?.id ||
      !programPatientId ||
      mutationQueue.length === 0 ||
      !navigator.onLine
    ) {
      return;
    }

    syncProgramMutations();
  }, [
    mutationQueue.length,
    programPatientId,
    queueLoaded,
    session?.user?.id,
    syncProgramMutations,
  ]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;

    function handleOnline() {
      syncProgramMutations();
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [session?.user?.id, syncProgramMutations]);

  return {
    queueSyncing,
    syncProgramMutations,
    claimSyncLock,
    releaseSyncLock,
  };
}
