// hooks/useIndexHistoryPagination.js — owns tracker history pagination and cache persistence
import { useCallback } from 'react';
import { isOfflineRequestError } from '../lib/fetch-with-offline';
import { fetchIndexLogsPage, INDEX_HISTORY_PAGE_SIZE, mergeIndexLogPages } from '../lib/index-data';
import { offlineCache } from '../lib/offline-cache';

export function useIndexHistoryPagination({
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
}) {
  return useCallback(async () => {
    if (!token || !patientId || historyLoadingMore || !historyHasMore || !historyNextCursor) {
      return { loaded: 0, hasMore: historyHasMore };
    }

    setHistoryLoadingMore(true);
    setHistoryError(null);

    try {
      const historyPage = await fetchIndexLogsPage(token, {
        before: historyNextCursor,
        limit: INDEX_HISTORY_PAGE_SIZE,
        includeAll: true,
      });
      const nextLogs = historyPage.logs ?? [];
      const mergedLogs = mergeIndexLogPages(logs, nextLogs);

      setLogs(mergedLogs);
      setHistoryHasMore(Boolean(historyPage.hasMore));
      setHistoryNextCursor(historyPage.nextCursor ?? null);

      if (typeof window !== 'undefined') {
        await offlineCache.init();
        await Promise.all([
          offlineCache.cacheLogs(mergedLogs),
          offlineCache.cacheTrackerBootstrap(patientId, {
            exercises,
            programs,
            logs: mergedLogs,
          }),
        ]);
      }

      return {
        loaded: nextLogs.length,
        hasMore: Boolean(historyPage.hasMore),
      };
    } catch (err) {
      const message = isOfflineRequestError(err)
        ? 'Offline - older history unavailable.'
        : err instanceof Error
          ? 'Failed to load older history. Check your connection.'
          : 'Failed to load older history.';
      setHistoryError(message);
      return {
        loaded: 0,
        hasMore: historyHasMore,
        error: message,
      };
    } finally {
      setHistoryLoadingMore(false);
    }
  }, [
    exercises,
    historyHasMore,
    historyLoadingMore,
    historyNextCursor,
    logs,
    patientId,
    programs,
    setHistoryError,
    setHistoryHasMore,
    setHistoryLoadingMore,
    setHistoryNextCursor,
    setLogs,
    token,
  ]);
}
