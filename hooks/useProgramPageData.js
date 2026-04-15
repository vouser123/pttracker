// hooks/useProgramPageData.js — owns the /program page bootstrap, cache restore, and live refresh
import { useCallback, useEffect, useState } from 'react';
import { isOfflineRequestError } from '../lib/fetch-with-offline';
import { offlineCache } from '../lib/offline-cache';
import {
  buildAccessErrorState,
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
import { fetchUsers, formatDisplayName } from '../lib/users';

/** /program bootstrap, cache, and offline fallback lifecycle. */
export function useProgramPageData({ session, patientId = null, initialAuthUserId = null }) {
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

  const restoreCachedProgramBootstrap = useCallback(async (authUserId, scopedPatientId) => {
    const cachedBootstrap = await readCachedProgramBootstrap(authUserId, scopedPatientId);
    if (cachedBootstrap) setState(cachedBootstrap);
    return cachedBootstrap;
  }, []);

  const loadData = useCallback(
    async (accessToken, authUserId, scopedPatientId) => {
      let cachedBootstrap = null;

      try {
        cachedBootstrap = await restoreCachedProgramBootstrap(authUserId, scopedPatientId);

        const usersData = await fetchUsers(accessToken);
        await offlineCache.cacheUsers(usersData);
        const currentUser = usersData.find((user) => user.auth_id === authUserId);
        if (!currentUser) throw new Error('Current user profile not found');

        if (currentUser.role !== 'therapist' && currentUser.role !== 'admin') {
          setState(buildAccessErrorState(currentUser));
          return null;
        }

        const patientUser = usersData.find((user) => user.id === scopedPatientId);
        if (!patientUser) throw new Error('Patient user not found');

        const patientDisplayName = formatDisplayName(patientUser);

        const [exercises, vocabularies, referenceData, programs] = await Promise.all([
          fetchExercises(accessToken),
          fetchVocabularies(accessToken),
          fetchReferenceData(accessToken),
          fetchPrograms(accessToken, scopedPatientId),
        ]);
        const nextData = {
          exercises,
          vocabularies,
          referenceData,
          programs,
          currentUserRole: currentUser.role,
          programPatientId: scopedPatientId,
          programPatientName: patientDisplayName,
        };
        await persistProgramDataSnapshot(nextData, authUserId, scopedPatientId);
        setState({ ...emptyProgramDataState(), ...nextData });
        return nextData;
      } catch (err) {
        try {
          cachedBootstrap ??= await restoreCachedProgramBootstrap(authUserId, scopedPatientId);
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
    if (session || !patientId) return;

    let cancelled = false;

    void (async () => {
      const fallbackAuthUserId =
        initialAuthUserId ?? (await offlineCache.getAuthState('auth_user_id'));
      if (!fallbackAuthUserId || cancelled) return;
      await restoreCachedProgramBootstrap(fallbackAuthUserId, patientId);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialAuthUserId, patientId, restoreCachedProgramBootstrap, session]);

  useEffect(() => {
    if (session && patientId) {
      void loadData(session.access_token, session.user.id, patientId);
    }
  }, [loadData, patientId, session]);

  useEffect(() => {
    if (!session) setState((prev) => ({ ...prev, currentUserRole: null, accessError: null }));
  }, [session]);

  return {
    ...state,
    loadData,
    setProgramDataSnapshot,
  };
}
