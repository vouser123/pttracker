// lib/program-bootstrap-warmup.js — owns /program bootstrap cache inspection and warm-fill writes
import { offlineCache } from './offline-cache';
import { fetchExercises, fetchPrograms, fetchReferenceData, fetchVocabularies } from './pt-editor';
import { fetchUsers, resolvePatientScopedUserContext } from './users';

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

export async function warmProgramBootstrapCache({ accessToken, authUserId }) {
  await offlineCache.init();

  const [cachedUsers, cachedExercises, cachedVocabularies, cachedReferenceData, cachedPrograms] =
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
    resolvedContext = resolvePatientScopedUserContext(users, authUserId);
  } catch {
    users = await fetchUsers(accessToken);
    await offlineCache.cacheUsers(users);
    resolvedContext = resolvePatientScopedUserContext(users, authUserId);
  }

  if (!resolvedContext?.currentUser || !resolvedContext?.patientUser) return;
  if (
    resolvedContext.currentUser.role !== 'therapist' &&
    resolvedContext.currentUser.role !== 'admin'
  ) {
    return;
  }

  const cacheWrites = [];

  if ((cachedExercises?.length ?? 0) === 0) {
    cacheWrites.push(
      fetchExercises(accessToken).then((exercises) => {
        return offlineCache.cacheExercises(exercises);
      }),
    );
  }

  if (!hasCachedVocabularies(cachedVocabularies)) {
    cacheWrites.push(
      fetchVocabularies(accessToken).then((vocabularies) => {
        return offlineCache.cacheProgramVocabularies(vocabularies);
      }),
    );
  }

  if (!hasCachedReferenceData(cachedReferenceData)) {
    cacheWrites.push(
      fetchReferenceData(accessToken).then((referenceData) => {
        return offlineCache.cacheProgramReferenceData(referenceData);
      }),
    );
  }

  if ((cachedPrograms?.length ?? 0) === 0) {
    cacheWrites.push(
      fetchPrograms(accessToken, resolvedContext.patientUser.id).then((programMap) => {
        return offlineCache.cachePrograms(Object.values(programMap ?? {}));
      }),
    );
  }

  if (cacheWrites.length > 0) {
    await Promise.all(cacheWrites);
  }

  await offlineCache.setUiState(
    `program_bootstrap:${authUserId}:${resolvedContext.patientUser.id}`,
    { authUserId, patientId: resolvedContext.patientUser.id, timestamp: Date.now() },
  );

  // Track the last warmed patient so the offline restore path can find it
  // without knowing the patientId upfront (no session → no allUsers → no patient selection).
  await offlineCache.setUiState(
    `last_program_patient_id:${authUserId}`,
    resolvedContext.patientUser.id,
  );
}
