import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
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
export function useProgramBootstrapWarmup() {
  const syncInFlightRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function warmProgramBootstrapCache() {
      if (syncInFlightRef.current) return syncInFlightRef.current;

      const run = (async () => {
        if (typeof window === 'undefined' || navigator.onLine === false) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token || !session.user?.id) return;

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
          if (cancelled) return;
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
              if (!cancelled) return offlineCache.cacheExercises(exercises);
            })
          );
        }

        if (!hasCachedVocabularies(cachedVocabularies)) {
          cacheWrites.push(
            fetchVocabularies(session.access_token).then((vocabularies) => {
              if (!cancelled) return offlineCache.cacheProgramVocabularies(vocabularies);
            })
          );
        }

        if (!hasCachedReferenceData(cachedReferenceData)) {
          cacheWrites.push(
            fetchReferenceData(session.access_token).then((referenceData) => {
              if (!cancelled) return offlineCache.cacheProgramReferenceData(referenceData);
            })
          );
        }

        if ((cachedPrograms?.length ?? 0) === 0) {
          cacheWrites.push(
            fetchPrograms(session.access_token, resolvedContext.patientUser.id).then((programMap) => {
              if (!cancelled) return offlineCache.cachePrograms(Object.values(programMap ?? {}));
            })
          );
        }

        if (cacheWrites.length > 0) {
          await Promise.all(cacheWrites);
        }
      })().catch((error) => {
        console.error('useProgramBootstrapWarmup failed:', error);
      });

      syncInFlightRef.current = run.finally(() => {
        syncInFlightRef.current = null;
      });

      return syncInFlightRef.current;
    }

    void warmProgramBootstrapCache();

    function handleOnline() {
      void warmProgramBootstrapCache();
    }

    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}
