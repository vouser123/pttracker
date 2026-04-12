// hooks/useIndexOfflineQueue.js — offline session queue lifecycle for tracker
/**
 * useIndexOfflineQueue — manages the offline session queue for the index page.
 *
 * Queue is stored under a user-scoped IndexedDB key (pt_offline_queue_${userId})
 * to prevent cross-account data carryover on shared devices (DN-022 fix).
 *
 * Responsibilities:
 *  - Load queue on mount
 *  - Enqueue new sessions when logging offline
 *  - Sync queue to /api/logs on demand or when coming back online
 *  - Expose clearQueue for sign-out (prevents cross-user leakage)
 *
 * @param {string|null} userId      - Supabase user ID (null when not signed in)
 * @param {string|null} accessToken - Supabase access token for authenticated API calls
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  clearQueue as clearQueueHelper,
  loadQueue,
  removeFromQueue,
  saveQueue,
} from '../lib/index-offline';
import { syncIndexQueue } from '../lib/index-sync';

export function useIndexOfflineQueue(userId, accessToken, options = {}) {
  const { autoSyncOnReconnect = true } = options;
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [queueError, setQueueError] = useState(null);

  // Ref so sync callback always sees the latest queue without re-registering
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Load queue from IndexedDB when userId becomes available
  useEffect(() => {
    let cancelled = false;

    async function hydrateQueue() {
      if (!userId) {
        setQueue([]);
        setQueueLoaded(false);
        return;
      }
      const stored = await loadQueue(userId);
      if (cancelled) return;
      setQueue(stored);
      setQueueLoaded(true);
    }

    hydrateQueue();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !queueLoaded) return;
    void saveQueue(userId, queue);
  }, [userId, queue, queueLoaded]);

  const enqueue = useCallback(
    (session) => {
      if (!userId) return;
      setQueue((prev) => [...prev, session]);
    },
    [userId],
  );

  const sync = useCallback(
    async (sessionsOverride = null) => {
      if (!userId || !accessToken || syncing) return { succeeded: 0, failed: 0 };

      const currentQueue = Array.isArray(sessionsOverride) ? sessionsOverride : queueRef.current;
      if (currentQueue.length === 0) {
        setQueueError(null);
        return { succeeded: 0, failed: 0 };
      }

      setSyncing(true);
      setQueueError(null);
      const { succeededIds, failedCount, lastError } = await syncIndexQueue(
        currentQueue,
        accessToken,
      );
      for (const id of succeededIds) {
        setQueue((prev) => removeFromQueue(prev, id));
      }
      setSyncing(false);
      if (failedCount > 0 && lastError) {
        setQueueError(lastError);
      }
      return { succeeded: succeededIds.length, failed: failedCount };
    },
    [userId, accessToken, syncing],
  );

  const clearQueue = useCallback(() => {
    if (!userId) return;
    void clearQueueHelper(userId);
    setQueue([]);
  }, [userId]);

  // Auto-sync on mount if already online with stranded queue items.
  // Catches the case where the app opens while online but has queued sessions
  // from a previous offline session (the 'online' event never fires in this case).
  useEffect(() => {
    if (!queueLoaded || !navigator.onLine) return;
    if (queueRef.current.length > 0) sync();
  }, [queueLoaded, sync]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync when coming back online mid-session
  useEffect(() => {
    if (!autoSyncOnReconnect) return undefined;

    function handleOnline() {
      if (queueRef.current.length > 0) sync();
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [autoSyncOnReconnect, sync]);

  return {
    queue,
    pendingCount: queue.length,
    syncing,
    queueLoaded,
    queueError,
    enqueue,
    sync,
    clearQueue,
  };
}
