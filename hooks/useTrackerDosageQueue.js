// hooks/useTrackerDosageQueue.js — offline queue lifecycle for tracker dosage mutations
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadProgramQueue, replayProgramQueue, saveProgramQueue } from '../lib/program-offline';

/**
 * Manages the offline queue for tracker dosage mutations.
 * Loads on mount, persists on change, syncs on reconnect.
 *
 * @param {object|null} session     - Supabase session (needs user.id and access_token)
 * @param {function}    onSynced    - Called after a successful sync batch (e.g. to trigger reload)
 */
export function useTrackerDosageQueue({ session, onSynced }) {
  const [mutationQueue, setMutationQueue] = useState([]);
  const [dosageSyncing, setDosageSyncing] = useState(false);
  const [dosageQueueError, setDosageQueueError] = useState(null);
  const queueRef = useRef([]);
  const syncInFlightRef = useRef(false);

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

  const syncQueue = useCallback(async () => {
    if (
      !session?.access_token ||
      !session?.user?.id ||
      !navigator.onLine ||
      syncInFlightRef.current
    ) {
      return;
    }

    const currentQueue = queueRef.current;
    if (!currentQueue.length) return;

    syncInFlightRef.current = true;
    setDosageSyncing(true);
    setDosageQueueError(null);
    try {
      const { failedMessage, syncedCount } = await replayProgramQueue(
        session.access_token,
        currentQueue,
        persistQueue,
      );

      if (failedMessage) {
        setDosageQueueError(failedMessage);
        return;
      }

      if (syncedCount > 0) {
        onSynced?.();
      }
    } finally {
      syncInFlightRef.current = false;
      setDosageSyncing(false);
    }
  }, [onSynced, persistQueue, session?.access_token, session?.user?.id]);

  // Load queue from storage on mount / user change
  useEffect(() => {
    let cancelled = false;

    if (!session?.user?.id) {
      queueRef.current = [];
      setMutationQueue([]);
      return () => {
        cancelled = true;
      };
    }

    loadProgramQueue(session.user.id)
      .then((queue) => {
        if (cancelled) return;
        queueRef.current = queue;
        setMutationQueue(queue);
      })
      .catch(() => {
        if (cancelled) return;
        queueRef.current = [];
        setMutationQueue([]);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Auto-sync when reconnecting
  useEffect(() => {
    function handleOnline() {
      void syncQueue();
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncQueue]);

  // Sync immediately if queue grows while already online
  useEffect(() => {
    if (!mutationQueue.length || !navigator.onLine) return;
    void syncQueue();
  }, [mutationQueue.length, syncQueue]);

  return { mutationQueue, dosageSyncing, dosageQueueError, persistQueue, syncQueue };
}
