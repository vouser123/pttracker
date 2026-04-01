import { useEffect, useRef } from 'react';
import { offlineCache } from '../lib/offline-cache';
import {
  fetchExercises,
  fetchPrograms,
  fetchReferenceData,
  fetchVocabularies,
} from '../lib/pt-editor';
import { fetchUsers, resolvePatientScopedUserContext } from '../lib/users';

function hasCachedReferenceData(referenceData) {
  return (
    (referenceData?.equipment?.length ?? 0) > 0 ||
    (referenceData?.muscles?.length ?? 0) > 0 ||
    (referenceData?.formParameters?.length ?? 0) > 0
  );
}

function hasCachedVocabularies(vocabularies) {
  return Object.values(vocabularies ?? {}).some((items) => (items?.length ?? 0) > 0);
}

/**
 * Warm the /program bootstrap cache from any authenticated protected-route visit.
 *
 * PT-office use can start from tracker or another authenticated route, then lose
 * signal before /program is opened. This hook fills missing editor bootstrap
 * caches online so /program can cold-open offline later.
 */
export function useProgramBootstrapWarmup({ session }) {
  const syncInFlightRef = useRef(null);

  useEffect(() => {
    async function warmProgramBootstrapCache() {
      if (typeof window === 'undefined' || navigator.onLine === false) return;
      if (!session?.access_token || !session.user?.id) return;

      const activeWarm = syncInFlightRef.current;
      if (activeWarm?.authUserId === session.user.id) {
        return activeWarm.promise;
      }

      const run = (async () => {
        await offlineCache.init();

        let [cachedUsers, cachedExercises, cachedVocabularies, cachedReferenceData, cachedPrograms] =
          await Promise.all([
            offlineCache.getCachedUsers(),
            offlineCache.getCachedExercises(),
            offlineCache.getCachedProgramVocabularies(),
            offlineCache.getCachedProgramReferenceData(),
            offlineCache.getCachedPrograms(),
          ]);

        let users = cachedUsers;
        let resolvedContext = null;

        try {
          resolvedContext = resolvePatientScopedUserContext(users, session.user.id);
        } catch {
          users = await fetchUsers(session.access_token);
          await offlineCache.cacheUsers(users);
          resolvedContext = resolvePatientScopedUserContext(users, session.user.id);
        }

        if (!resolvedContext?.currentUser || !resolvedContext?.patientUser) return;
        if (resolvedContext.currentUser.role !== 'therapist' && resolvedContext.currentUser.role !== 'admin') {
          return;
        }

        const cacheWrites = [];

        if ((cachedExercises?.length ?? 0) === 0) {
          cacheWrites.push(
            fetchExercises(session.access_token).then((exercises) => {
              return offlineCache.cacheExercises(exercises);
            })
          );
        }

        if (!hasCachedVocabularies(cachedVocabularies)) {
          cacheWrites.push(
            fetchVocabularies(session.access_token).then((vocabularies) => {
              return offlineCache.cacheProgramVocabularies(vocabularies);
            })
          );
        }

        if (!hasCachedReferenceData(cachedReferenceData)) {
          cacheWrites.push(
            fetchReferenceData(session.access_token).then((referenceData) => {
              return offlineCache.cacheProgramReferenceData(referenceData);
            })
          );
        }

        if ((cachedPrograms?.length ?? 0) === 0) {
          cacheWrites.push(
            fetchPrograms(session.access_token, resolvedContext.patientUser.id).then((programMap) => {
              return offlineCache.cachePrograms(Object.values(programMap ?? {}));
            })
          );
        }

        if (cacheWrites.length > 0) {
          await Promise.all(cacheWrites);
        }

        // Warm the SW page cache for /program so it loads offline without a prior visit.
        // The SW NetworkFirst strategy only caches /program HTML when the user navigates
        // there while online. Hidden hamburger menu links are never prefetched by Next.js
        // on iOS, so the SW cache stays empty. Fetching here forces the SW to cache both
        // the full-page HTML (hamburger/direct navigation) and the RSC prefetch response
        // (client-side next/link navigation).
        await Promise.all([
          fetch('/program', { credentials: 'include' }),
          fetch('/program', { credentials: 'include', headers: { 'RSC': '1', 'Next-Router-Prefetch': '1' } }),
        ]).catch(() => {
          // Non-fatal — best-effort SW cache warm. IDB data is already written above.
        });
      })().catch((error) => {
        console.error('useProgramBootstrapWarmup failed:', error);
      });

      const trackedRun = run.finally(() => {
        if (syncInFlightRef.current?.promise === trackedRun) {
          syncInFlightRef.current = null;
        }
      });

      syncInFlightRef.current = {
        authUserId: session.user.id,
        promise: trackedRun,
      };

      return trackedRun;
    }

    void warmProgramBootstrapCache();

    function handleOnline() {
      void warmProgramBootstrapCache();
    }

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [session]);
}
