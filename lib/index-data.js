// lib/index-data.js — fetch adapters for tracker exercises, programs, and history logs
import { fetchJsonWithOffline } from './fetch-with-offline';

export const INDEX_HISTORY_PAGE_SIZE = 1000;

export async function fetchIndexExercises(token) {
  const data = await fetchJsonWithOffline('/api/exercises', {
    token,
    errorPrefix: 'Failed to load exercises',
    offlineMessage: 'Offline - exercises unavailable.',
  });
  return data.exercises ?? [];
}

export async function fetchIndexPrograms(token, patientId) {
  const data = await fetchJsonWithOffline(`/api/programs?patient_id=${patientId}`, {
    token,
    errorPrefix: 'Failed to load programs',
    offlineMessage: 'Offline - programs unavailable.',
  });
  return data.programs ?? [];
}

// DN-059: Omit patient_id — API uses req.user.id (profile UUID) via fallback.
// Passing session.user.id (auth UUID) caused 0 rows since patient_activity_logs
// stores profile UUIDs; the logs API has no auth_id→users.id resolution.
export async function fetchIndexLogsPage(
  token,
  { before = null, limit = INDEX_HISTORY_PAGE_SIZE, includeAll = true } = {},
) {
  const params = new URLSearchParams();
  if (includeAll) {
    params.set('include_all', 'true');
  }
  params.set('limit', String(limit));
  if (before) {
    params.set('before', before);
  }

  return fetchJsonWithOffline(`/api/logs?${params.toString()}`, {
    token,
    errorPrefix: 'Failed to load logs',
    offlineMessage: 'Offline - logs unavailable.',
  });
}

export async function fetchIndexLogs(token, options) {
  const data = await fetchIndexLogsPage(token, options);
  return data.logs ?? [];
}

export function mergeIndexLogPages(existingLogs, nextLogs) {
  const merged = [...(existingLogs ?? [])];
  const seenIds = new Set(merged.map((log) => log?.id).filter(Boolean));

  for (const log of nextLogs ?? []) {
    if (!log?.id || seenIds.has(log.id)) continue;
    merged.push(log);
    seenIds.add(log.id);
  }

  return merged;
}
