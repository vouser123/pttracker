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
import type {
  AuthSessionLike,
  ProgramExerciseLike,
  ProgramPageDataLike,
  ProgramRecordLike,
  ProgramSnapshotLike,
  UserLike,
  VocabTermLike,
} from './program-route-types';

interface ProgramPageState
  extends Omit<ProgramPageDataLike, 'loadData' | 'setProgramDataSnapshot'> {
  programPatientName?: string | null;
  [key: string]: unknown;
}

/** /program bootstrap, cache, and offline fallback lifecycle. */
export function useProgramPageData({
  session,
  patientId = null,
  initialAuthUserId = null,
}: {
  session: AuthSessionLike | null;
  patientId?: string | null;
  initialAuthUserId?: string | null;
}): ProgramPageDataLike {
  const [state, setState] = useState<ProgramPageState>(emptyProgramDataState);

  const setProgramDataSnapshot = useCallback((snapshot: ProgramSnapshotLike) => {
    setState((previous) => ({
      ...previous,
      exercises: snapshot.exercises,
      referenceData: snapshot.referenceData,
      vocabularies: snapshot.vocabularies,
      programs: snapshot.programs,
    }));
  }, []);

  const restoreCachedProgramBootstrap = useCallback(
    async (authUserId: string, scopedPatientId: string | null) => {
      const cachedBootstrap = (await readCachedProgramBootstrap(
        authUserId,
        scopedPatientId,
      )) as ProgramPageState | null;
      if (cachedBootstrap) setState(cachedBootstrap);
      return cachedBootstrap;
    },
    [],
  );

  const loadData = useCallback(
    async (accessToken: string, authUserId: string, scopedPatientId: string | null) => {
      let cachedBootstrap: ProgramPageState | null = null;

      try {
        cachedBootstrap = await restoreCachedProgramBootstrap(authUserId, scopedPatientId);

        const usersData = (await fetchUsers(accessToken)) as UserLike[];
        await offlineCache.cacheUsers(usersData);
        const currentUser = usersData.find((user) => user.auth_id === authUserId);
        if (!currentUser) throw new Error('Current user profile not found');

        if (currentUser.role !== 'therapist' && currentUser.role !== 'admin') {
          setState(buildAccessErrorState(currentUser));
          return null;
        }

        const patientUser = scopedPatientId
          ? usersData.find((user) => user.id === scopedPatientId)
          : null;
        if (!patientUser) throw new Error('Patient user not found');

        const resolvedPatientId = patientUser.id;
        const patientDisplayName = formatDisplayName(patientUser);

        const [exercises, vocabularies, referenceData, programs] = (await Promise.all([
          fetchExercises(accessToken),
          fetchVocabularies(accessToken),
          fetchReferenceData(accessToken),
          fetchPrograms(accessToken, resolvedPatientId),
        ])) as [
          ProgramExerciseLike[],
          Record<string, VocabTermLike[]>,
          Record<string, unknown>,
          Record<string, ProgramRecordLike>,
        ];
        const nextData = {
          exercises,
          vocabularies,
          referenceData,
          programs,
          currentUserRole: currentUser.role,
          programPatientId: resolvedPatientId,
          programPatientName: patientDisplayName,
        };
        await persistProgramDataSnapshot(nextData, authUserId, resolvedPatientId);
        setState({ ...emptyProgramDataState(), ...nextData });
        return nextData;
      } catch (err: unknown) {
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
          const loadError =
            err instanceof Error ? err.message : 'Failed to load program editor data.';
          setState({ ...emptyProgramDataState(), loadError });
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
      // patientId is null when offline (no session → useAllUsers returns [] → no selection).
      // Fall back to the last patient stamped by warmup or a live /program visit.
      const effectivePatientId =
        patientId ??
        (await offlineCache.getUiState(`last_program_patient_id:${fallbackAuthUserId}`, null));
      if (!effectivePatientId || cancelled) return;
      await restoreCachedProgramBootstrap(fallbackAuthUserId, effectivePatientId);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialAuthUserId, patientId, restoreCachedProgramBootstrap, session]);

  useEffect(() => {
    if (session?.access_token && session.user?.id && patientId) {
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
