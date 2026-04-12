// lib/tracker-bootstrap.js — tracker bootstrap cache reads, writes, and error shaping helpers
import { isOfflineRequestError } from './fetch-with-offline';
import {
  fetchIndexExercises,
  fetchIndexLogsPage,
  fetchIndexPrograms,
  INDEX_HISTORY_PAGE_SIZE,
} from './index-data';
import { offlineCache } from './offline-cache';
import {
  markTrackerBootstrapStart,
  markTrackerHistoryReady,
  markTrackerPrimaryReady,
} from './tracker-performance';

export function getTrackerBootstrapLoadError(error) {
  if (isOfflineRequestError(error)) {
    return 'Offline - cached tracker data unavailable.';
  }
  const message = error instanceof Error ? error.message : 'Failed to load index data';
  if (message.startsWith('Failed to load exercises')) {
    return 'Failed to load exercises. Check your connection.';
  }
  if (message.startsWith('Failed to load logs')) {
    return 'Failed to load history.';
  }
  return message;
}

export function inferCachedHistoryPageState(cachedLogs) {
  const normalizedLogs = cachedLogs ?? [];
  const maybeHasMore = normalizedLogs.length >= INDEX_HISTORY_PAGE_SIZE;

  return {
    historyHasMore: maybeHasMore,
    historyNextCursor: maybeHasMore
      ? (normalizedLogs[normalizedLogs.length - 1]?.performed_at ?? null)
      : null,
  };
}

export async function readCachedTrackerBootstrap(patientId) {
  await offlineCache.init();
  const cachedBootstrap = await offlineCache.getCachedTrackerBootstrap(patientId);
  const cachedExercises = cachedBootstrap?.exercises ?? [];
  const cachedPrograms = cachedBootstrap?.programs ?? [];
  const cachedLogs = cachedBootstrap?.logs ?? [];
  const hasCachedData =
    cachedExercises.length > 0 || cachedPrograms.length > 0 || cachedLogs.length > 0;

  return {
    cachedExercises,
    cachedPrograms,
    cachedLogs,
    hasCachedData,
    historyState: inferCachedHistoryPageState(cachedLogs),
  };
}

export async function persistTrackerBootstrap(patientId, { exercises, programs, logs }) {
  await offlineCache.init();
  await Promise.all([
    offlineCache.cacheExercises(exercises),
    offlineCache.cachePrograms(programs),
    offlineCache.cacheTrackerBootstrap(patientId, {
      exercises,
      programs,
      logs,
    }),
  ]);
}

export async function persistTrackerHistory(patientId, { exercises, programs, logs }) {
  await offlineCache.init();
  await Promise.all([
    offlineCache.cacheLogs(logs),
    offlineCache.cacheTrackerBootstrap(patientId, {
      exercises,
      programs,
      logs,
    }),
  ]);
}

export async function loadTrackerBootstrapData({
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
}) {
  if (!token || !patientId) return;
  setLoading(true);
  setHistoryLoading(true);
  setError(null);
  setHistoryError(null);
  setFromCache(false);
  markTrackerBootstrapStart();

  let nextExercises = [];
  let nextPrograms = [];
  let nextBootstrapLogs = [];
  let servedCachedBootstrap = false;

  if (typeof window !== 'undefined') {
    try {
      const cachedBootstrap = await readCachedTrackerBootstrap(patientId);
      const { cachedExercises, cachedPrograms, cachedLogs, hasCachedData, historyState } =
        cachedBootstrap;

      if (hasCachedData) {
        setExercises(cachedExercises);
        setPrograms(cachedPrograms);
        setLogs(cachedLogs);
        setHistoryHasMore(historyState.historyHasMore);
        setHistoryNextCursor(historyState.historyNextCursor);
        setFromCache(true);
        setLoading(false);
        setHistoryLoading(false);
        servedCachedBootstrap = true;
        nextBootstrapLogs = cachedLogs;
        markTrackerPrimaryReady();
        markTrackerHistoryReady();
      }
    } catch (cacheError) {
      console.error('useIndexData cache-first bootstrap failed:', cacheError);
    }
  }

  try {
    [nextExercises, nextPrograms] = await Promise.all([
      fetchIndexExercises(token),
      fetchIndexPrograms(token, patientId),
    ]);
    if (typeof window !== 'undefined') {
      await persistTrackerBootstrap(patientId, {
        exercises: nextExercises,
        programs: nextPrograms,
        logs: nextBootstrapLogs,
      });
    }
    setExercises(nextExercises);
    setPrograms(nextPrograms);
    setFromCache(false);
    setError(null);
    markTrackerPrimaryReady();
  } catch (err) {
    const message = getTrackerBootstrapLoadError(err);
    if (typeof window === 'undefined') {
      setError(message);
      setHistoryLoading(false);
      return;
    }

    try {
      const cachedBootstrap = await readCachedTrackerBootstrap(patientId);
      const { cachedExercises, cachedPrograms, cachedLogs, hasCachedData, historyState } =
        cachedBootstrap;

      if (hasCachedData) {
        setExercises(cachedExercises);
        setPrograms(cachedPrograms);
        setLogs(cachedLogs);
        setHistoryHasMore(historyState.historyHasMore);
        setHistoryNextCursor(historyState.historyNextCursor);
        setFromCache(true);
        setHistoryError(null);
        setHistoryLoading(false);
        markTrackerPrimaryReady();
        markTrackerHistoryReady();
        return;
      }
    } catch (cacheError) {
      console.error('useIndexData cache fallback failed:', cacheError);
    }

    if (servedCachedBootstrap) {
      setError(null);
      setHistoryLoading(false);
      return;
    }

    setError(message);
    setHistoryLoading(false);
    return;
  } finally {
    if (!servedCachedBootstrap) {
      setLoading(false);
    }
  }

  try {
    const historyPage = await fetchIndexLogsPage(token); // DN-059: no patientId — API resolves profile UUID from req.user.id
    const nextLogs = historyPage.logs ?? [];
    nextBootstrapLogs = nextLogs;
    if (typeof window !== 'undefined') {
      await persistTrackerHistory(patientId, {
        exercises: nextExercises,
        programs: nextPrograms,
        logs: nextLogs,
      });
    }
    setLogs(nextLogs);
    setHistoryHasMore(Boolean(historyPage.hasMore));
    setHistoryNextCursor(historyPage.nextCursor ?? null);
    setFromCache(false);
    setHistoryError(null);
    markTrackerHistoryReady();
  } catch (err) {
    const message = getTrackerBootstrapLoadError(err);
    if (typeof window === 'undefined') {
      setHistoryError(message);
      return;
    }

    try {
      const cachedBootstrap = await readCachedTrackerBootstrap(patientId);
      const cachedLogs = cachedBootstrap.cachedLogs;

      if (cachedLogs.length > 0) {
        const cachedHistoryState = cachedBootstrap.historyState;
        setLogs(cachedLogs);
        setHistoryHasMore(cachedHistoryState.historyHasMore);
        setHistoryNextCursor(cachedHistoryState.historyNextCursor);
        markTrackerHistoryReady();
        return;
      }
    } catch (cacheError) {
      console.error('useIndexData history cache fallback failed:', cacheError);
    }

    if (!servedCachedBootstrap) {
      setHistoryError(message);
    }
  } finally {
    if (!servedCachedBootstrap) {
      setHistoryLoading(false);
    }
  }
}
