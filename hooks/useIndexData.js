// hooks/useIndexData.js — loads tracker bootstrap data (exercises, programs, logs) with loading/error state
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    fetchIndexExercises,
    fetchIndexLogsPage,
    fetchIndexPrograms,
    INDEX_HISTORY_PAGE_SIZE,
    mergeIndexLogPages,
} from '../lib/index-data';
import { offlineCache } from '../lib/offline-cache';
import {
    markTrackerBootstrapStart,
    markTrackerHistoryReady,
    markTrackerPrimaryReady,
} from '../lib/tracker-performance';

function getLoadErrorMessage(error) {
    const message = error instanceof Error ? error.message : 'Failed to load index data';
    if (message.startsWith('Failed to load exercises')) {
        return 'Failed to load exercises. Check your connection.';
    }
    if (message.startsWith('Failed to load logs')) {
        return 'Failed to load history.';
    }
    return message;
}

function getCachedBootstrapSummary(cachedBootstrap) {
    const cachedExercises = cachedBootstrap?.exercises ?? [];
    const cachedPrograms = cachedBootstrap?.programs ?? [];
    const cachedLogs = cachedBootstrap?.logs ?? [];
    const hasCachedData = cachedExercises.length > 0 || cachedPrograms.length > 0 || cachedLogs.length > 0;

    return {
        cachedExercises,
        cachedPrograms,
        cachedLogs,
        hasCachedData,
    };
}

function inferCachedHistoryPageState(cachedLogs) {
    const normalizedLogs = cachedLogs ?? [];
    const maybeHasMore = normalizedLogs.length >= INDEX_HISTORY_PAGE_SIZE;

    return {
        historyHasMore: maybeHasMore,
        historyNextCursor: maybeHasMore ? (normalizedLogs[normalizedLogs.length - 1]?.performed_at ?? null) : null,
    };
}

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
                await offlineCache.init();
                const cachedBootstrap = await offlineCache.getCachedTrackerBootstrap(patientId);
                const {
                    cachedExercises,
                    cachedPrograms,
                    cachedLogs,
                    hasCachedData,
                } = getCachedBootstrapSummary(cachedBootstrap);

                if (hasCachedData) {
                    const cachedHistoryState = inferCachedHistoryPageState(cachedLogs);
                    setExercises(cachedExercises);
                    setPrograms(cachedPrograms);
                    setLogs(cachedLogs);
                    setHistoryHasMore(cachedHistoryState.historyHasMore);
                    setHistoryNextCursor(cachedHistoryState.historyNextCursor);
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
                await offlineCache.init();
                await Promise.all([
                    offlineCache.cacheExercises(nextExercises),
                    offlineCache.cachePrograms(nextPrograms),
                    offlineCache.cacheTrackerBootstrap(patientId, {
                        exercises: nextExercises,
                        programs: nextPrograms,
                        logs: nextBootstrapLogs,
                    }),
                ]);
            }
            setExercises(nextExercises);
            setPrograms(nextPrograms);
            setFromCache(false);
            setError(null);
            markTrackerPrimaryReady();
        } catch (err) {
            const message = getLoadErrorMessage(err);
            if (typeof window === 'undefined') {
                setError(message);
                setHistoryLoading(false);
                return;
            }

            try {
                await offlineCache.init();
                const cachedBootstrap = await offlineCache.getCachedTrackerBootstrap(patientId);
                const {
                    cachedExercises,
                    cachedPrograms,
                    cachedLogs,
                    hasCachedData,
                } = getCachedBootstrapSummary(cachedBootstrap);

                if (hasCachedData) {
                    const cachedHistoryState = inferCachedHistoryPageState(cachedLogs);
                    setExercises(cachedExercises);
                    setPrograms(cachedPrograms);
                    setLogs(cachedLogs);
                    setHistoryHasMore(cachedHistoryState.historyHasMore);
                    setHistoryNextCursor(cachedHistoryState.historyNextCursor);
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
                await offlineCache.init();
                await Promise.all([
                    offlineCache.cacheLogs(nextLogs),
                    offlineCache.cacheTrackerBootstrap(patientId, {
                        exercises: nextExercises,
                        programs: nextPrograms,
                        logs: nextLogs,
                    }),
                ]);
            }
            setLogs(nextLogs);
            setHistoryHasMore(Boolean(historyPage.hasMore));
            setHistoryNextCursor(historyPage.nextCursor ?? null);
            setFromCache(false);
            setHistoryError(null);
            markTrackerHistoryReady();
        } catch (err) {
            const message = getLoadErrorMessage(err);
            if (typeof window === 'undefined') {
                setHistoryError(message);
                return;
            }

            try {
                await offlineCache.init();
                const cachedBootstrap = await offlineCache.getCachedTrackerBootstrap(patientId);
                const cachedLogs = cachedBootstrap?.logs ?? [];

                if (cachedLogs.length > 0) {
                    const cachedHistoryState = inferCachedHistoryPageState(cachedLogs);
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
    }, [token, patientId]);

    const loadMoreHistory = useCallback(async () => {
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
            const message = err instanceof Error
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
    }, [exercises, historyHasMore, historyLoadingMore, historyNextCursor, logs, patientId, programs, token]);

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
