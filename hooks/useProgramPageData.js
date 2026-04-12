// hooks/useProgramPageData.js — owns the /program page bootstrap, cache restore, and live refresh
import { useCallback, useEffect, useState } from 'react';
import { isOfflineRequestError } from '../lib/fetch-with-offline';
import { offlineCache } from '../lib/offline-cache';
import {
  emptyProgramDataState,
  persistProgramDataSnapshot,
  readCachedProgramBootstrap,
} from '../lib/program-page-data';
import {
  fetchExercises,
  fetchPrograms,
  fetchReferenceData,
  fetchVocabularies,
} from '../lib/pt-editor';
import { fetchUsers, resolvePatientScopedUserContext } from '../lib/users';

/**
 * /program bootstrap, cache, and offline fallback lifecycle.
 * @param {{ session: object|null }} params
 * @returns {object}
 */
export function useProgramPageData({ session, initialAuthUserId = null }) {
  const [state, setState] = useState(emptyProgramDataState);

  const setProgramDataSnapshot = useCallback((snapshot) => {
    setState((previous) => ({
      ...previous,
      exercises: snapshot.exercises,
      referenceData: snapshot.referenceData,
      vocabularies: snapshot.vocabularies,
      programs: snapshot.programs,
    }));
  }, []);

  const restoreCachedProgramBootstrap = useCallback(async (authUserId) => {
    const cachedBootstrap = await readCachedProgramBootstrap(authUserId);

    if (cachedBootstrap) {
      setState(cachedBootstrap);
    }

    return cachedBootstrap;
  }, []);

  const loadData = useCallback(
    async (accessToken, authUserId) => {
      let cachedBootstrap = null;

      try {
        cachedBootstrap = await restoreCachedProgramBootstrap(authUserId);

        const usersData = await fetchUsers(accessToken);
        await offlineCache.cacheUsers(usersData);
        const currentUser = usersData.find((user) => user.auth_id === authUserId);
        if (!currentUser) throw new Error('Current user profile not found');

        if (currentUser.role !== 'therapist' && currentUser.role !== 'admin') {
          setState({
            ...emptyProgramDataState(),
            currentUserRole: currentUser.role,
            accessError: 'Therapist or admin access required.',
          });
          return null;
        }

        const { patientUser, patientDisplayName } = resolvePatientScopedUserContext(
          usersData,
          authUserId,
        );
        const [exercises, vocabularies, referenceData, programs] = await Promise.all([
          fetchExercises(accessToken),
          fetchVocabularies(accessToken),
          fetchReferenceData(accessToken),
          fetchPrograms(accessToken, patientUser.id),
        ]);
        const nextData = {
          exercises,
          vocabularies,
          referenceData,
          programs,
          currentUserRole: currentUser.role,
          programPatientId: patientUser.id,
          programPatientName: patientDisplayName,
        };
        await persistProgramDataSnapshot(nextData);
        setState({ ...emptyProgramDataState(), ...nextData });
        return nextData;
      } catch (err) {
        try {
          if (!cachedBootstrap) {
            cachedBootstrap = await restoreCachedProgramBootstrap(authUserId);
          }

          if (!cachedBootstrap) throw err;

          setState({
            ...cachedBootstrap,
            offlineNotice: isOfflineRequestError(err)
              ? 'Offline - showing cached editor data.'
              : 'Live refresh failed - showing cached editor data.',
          });
          return cachedBootstrap;
        } catch {
          setState({ ...emptyProgramDataState(), loadError: err.message });
          return null;
        }
      }
    },
    [restoreCachedProgramBootstrap],
  );

  useEffect(() => {
    if (session) return;

    let cancelled = false;

    void (async () => {
      const fallbackAuthUserId =
        initialAuthUserId ?? (await offlineCache.getAuthState('auth_user_id'));
      if (!fallbackAuthUserId || cancelled) return;
      await restoreCachedProgramBootstrap(fallbackAuthUserId);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialAuthUserId, restoreCachedProgramBootstrap, session]);

  useEffect(() => {
    if (session) void loadData(session.access_token, session.user.id);
  }, [loadData, session]);

  useEffect(() => {
    if (!session) {
      setState((previous) => ({
        ...previous,
        currentUserRole: null,
        accessError: null,
      }));
    }
  }, [session]);

  return {
    ...state,
    loadData,
    setProgramDataSnapshot,
  };
}
