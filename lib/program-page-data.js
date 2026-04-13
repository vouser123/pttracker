// lib/program-page-data.js — pure /program bootstrap shaping and cached snapshot helpers
import { offlineCache } from './offline-cache';
import { emptyReferenceData } from './program-optimistic';
import { resolvePatientScopedUserContext } from './users';

export function emptyProgramDataState() {
  return {
    exercises: [],
    referenceData: emptyReferenceData(),
    vocabularies: {},
    programs: {},
    loadError: null,
    offlineNotice: null,
    currentUserRole: null,
    accessError: null,
    programPatientId: null,
    programPatientName: '',
  };
}

export function buildAccessErrorState(currentUser) {
  return {
    ...emptyProgramDataState(),
    currentUserRole: currentUser.role,
    accessError: 'Therapist or admin access required.',
  };
}

export function buildCachedProgramSnapshot(
  cachedUsers,
  authUserId,
  cachedExercises,
  cachedVocabularies,
  cachedReferenceData,
  cachedPrograms,
) {
  const currentUser = (cachedUsers ?? []).find((user) => user.auth_id === authUserId);
  if (!currentUser) return null;

  if (currentUser.role !== 'therapist' && currentUser.role !== 'admin') {
    return buildAccessErrorState(currentUser);
  }

  const { patientUser, patientDisplayName } = resolvePatientScopedUserContext(
    cachedUsers,
    authUserId,
  );
  const programMap = Object.fromEntries(
    (cachedPrograms ?? []).map((program) => [program.exercise_id, program]),
  );
  const hasCachedBootstrap =
    (cachedExercises?.length ?? 0) > 0 ||
    Object.keys(cachedVocabularies ?? {}).length > 0 ||
    (cachedReferenceData?.equipment?.length ?? 0) > 0 ||
    (cachedReferenceData?.muscles?.length ?? 0) > 0 ||
    (cachedReferenceData?.formParameters?.length ?? 0) > 0 ||
    Object.keys(programMap).length > 0;

  if (!hasCachedBootstrap) return null;

  return {
    ...emptyProgramDataState(),
    exercises: cachedExercises ?? [],
    vocabularies: cachedVocabularies ?? {},
    referenceData: cachedReferenceData ?? emptyReferenceData(),
    programs: programMap,
    currentUserRole: currentUser.role,
    programPatientId: patientUser.id,
    programPatientName: patientDisplayName,
  };
}

export async function persistProgramDataSnapshot(snapshot) {
  await offlineCache.init();
  await Promise.all([
    offlineCache.cacheExercises(snapshot.exercises),
    offlineCache.cacheProgramVocabularies(snapshot.vocabularies),
    offlineCache.cacheProgramReferenceData(snapshot.referenceData),
    offlineCache.cachePrograms(Object.values(snapshot.programs ?? {})),
  ]);
}

export async function readCachedProgramBootstrap(authUserId) {
  if (!authUserId) return null;

  await offlineCache.init();
  const [cachedUsers, cachedExercises, cachedVocabularies, cachedReferenceData, cachedPrograms] =
    await Promise.all([
      offlineCache.getCachedUsers(),
      offlineCache.getCachedExercises(),
      offlineCache.getCachedProgramVocabularies(),
      offlineCache.getCachedProgramReferenceData(),
      offlineCache.getCachedPrograms(),
    ]);

  return buildCachedProgramSnapshot(
    cachedUsers,
    authUserId,
    cachedExercises,
    cachedVocabularies,
    cachedReferenceData,
    cachedPrograms,
  );
}
