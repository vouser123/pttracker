// hooks/usePtViewData.js — owns pt-view cache-first logs/programs loading for the history dashboard
import { useEffect, useState } from 'react';
import { isOfflineRequestError } from '../lib/fetch-with-offline';
import { offlineCache } from '../lib/offline-cache';
import { fetchLogs, fetchPrograms, isRoutineExercise } from '../lib/pt-view';

function getDefaultState() {
  return {
    logs: [],
    programs: [],
    dataError: null,
    offlineNotice: null,
  };
}

/**
 * Build an immediate-render state from cached data.
 * Returns null if the cache is empty (nothing worth showing yet).
 */
function buildCachedSnapshot(cachedLogs, cachedPrograms) {
  const hasCachedData = (cachedLogs?.length ?? 0) > 0 || (cachedPrograms?.length ?? 0) > 0;
  if (!hasCachedData) return null;

  return {
    logs: cachedLogs ?? [],
    programs: (cachedPrograms ?? []).filter((p) => isRoutineExercise(p?.exercises)),
    dataError: null,
    offlineNotice: null,
  };
}

/**
 * @param {{ token: string|null, patientId: string|null }} params
 * @returns {{ logs: Array, programs: Array, dataError: string|null, offlineNotice: string|null }}
 */
export function usePtViewData({ token, patientId }) {
  const [state, setState] = useState(getDefaultState);

  useEffect(() => {
    // Wait for upstream useUserContext to resolve patientId.
    // When token is null (signed out), clear cached logs/programs.
    if (!token || !patientId) {
      if (!token) {
        void offlineCache
          .init()
          .then(() => Promise.all([offlineCache.clearPrograms(), offlineCache.clearLogs()]))
          .catch((err) => console.error('usePtViewData cache clear failed:', err));
        setState(getDefaultState());
      }
      return;
    }

    let cancelled = false;

    function applyState(nextState) {
      if (!cancelled) setState(nextState);
    }

    async function load() {
      let cachedSnapshot = null;

      try {
        await offlineCache.init();

        // Check cache first — render immediately if usable data exists.
        const [cachedLogs, cachedPrograms] = await Promise.all([
          offlineCache.getCachedLogs(),
          offlineCache.getCachedPrograms(),
        ]);
        cachedSnapshot = buildCachedSnapshot(cachedLogs, cachedPrograms);

        if (cachedSnapshot) {
          applyState(cachedSnapshot);
        }

        // Background network refresh.
        const [logsData, programsData] = await Promise.all([
          fetchLogs(token, patientId),
          fetchPrograms(token, patientId),
        ]);

        await Promise.all([
          offlineCache.cacheLogs(logsData),
          offlineCache.cachePrograms(programsData),
        ]);

        applyState({
          logs: logsData ?? [],
          programs: (programsData ?? []).filter((p) => isRoutineExercise(p?.exercises)),
          dataError: null,
          offlineNotice: null,
        });
      } catch (error) {
        // Network failed. If we already painted from cache, stay there with offline notice.
        if (cachedSnapshot) {
          applyState({
            ...cachedSnapshot,
            offlineNotice: isOfflineRequestError(error)
              ? 'Offline - showing cached data.'
              : 'Live refresh failed - showing cached data.',
          });
          return;
        }

        // No pre-loaded cache — try one more cache read as last resort.
        try {
          await offlineCache.init();
          const [cachedLogs, cachedPrograms] = await Promise.all([
            offlineCache.getCachedLogs(),
            offlineCache.getCachedPrograms(),
          ]);
          const fallback = buildCachedSnapshot(cachedLogs, cachedPrograms);
          if (fallback) {
            applyState({
              ...fallback,
              offlineNotice: isOfflineRequestError(error)
                ? 'Offline - showing cached data.'
                : 'Live refresh failed - showing cached data.',
            });
          } else {
            applyState({ ...getDefaultState(), dataError: error.message });
          }
        } catch {
          applyState({ ...getDefaultState(), dataError: error.message });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, patientId]);

  return state;
}
