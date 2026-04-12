// hooks/useIndexData.js — loads tracker bootstrap data (exercises, programs, logs) with loading/error state
import { useCallback, useEffect, useRef, useState } from 'react';
import { offlineCache } from '../lib/offline-cache';
import { loadTrackerBootstrapData } from '../lib/tracker-bootstrap';
import { useIndexHistoryPagination } from './useIndexHistoryPagination';

export function useIndexData(token, patientId) {
  const [exercises, setExercises] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyNextCursor, setHistoryNextCursor] = useState(null);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const hadAuthRef = useRef(false);

  const reload = useCallback(async () => {
    await loadTrackerBootstrapData({
      token,
      patientId,
      setExercises,
      setPrograms,
      setLogs,
      setLoading,
      setHistoryLoading,
      setHistoryHasMore,
      setHistoryNextCursor,
      setError,
      setHistoryError,
      setFromCache,
    });
  }, [patientId, token]);

  const loadMoreHistory = useIndexHistoryPagination({
    token,
    patientId,
    exercises,
    programs,
    logs,
    historyHasMore,
    historyLoadingMore,
    historyNextCursor,
    setLogs,
    setHistoryHasMore,
    setHistoryNextCursor,
    setHistoryError,
    setHistoryLoadingMore,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && token && patientId) {
      void offlineCache.init().catch((cacheError) => {
        console.error('useIndexData cache init failed:', cacheError);
      });
    }

    if (!token || !patientId) {
      if (hadAuthRef.current && typeof window !== 'undefined') {
        void Promise.all([
          offlineCache.clearExercises(),
          offlineCache.clearPrograms(),
          offlineCache.clearLogs(),
          offlineCache.clearTrackerBootstrap(),
        ]).catch((cacheError) => {
          console.error('useIndexData cache clear failed:', cacheError);
        });
      }

      setExercises([]);
      setPrograms([]);
      setLogs([]);
      setLoading(false);
      setHistoryLoading(false);
      setHistoryLoadingMore(false);
      setHistoryHasMore(false);
      setHistoryNextCursor(null);
      setError(null);
      setHistoryError(null);
      setFromCache(false);
      hadAuthRef.current = false;
      return;
    }

    hadAuthRef.current = true;
    reload();
  }, [token, patientId, reload]);

  return {
    exercises,
    programs,
    logs,
    loading,
    historyLoading,
    historyLoadingMore,
    historyHasMore,
    error,
    historyError,
    loadMoreHistory,
    fromCache,
    reload,
  };
}
