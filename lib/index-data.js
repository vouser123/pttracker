// lib/index-data.js — fetch adapters for tracker exercises, programs, and history logs
function authHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

export const INDEX_HISTORY_PAGE_SIZE = 1000;

export async function fetchIndexExercises(token) {
    const response = await fetch('/api/exercises', {
        headers: authHeaders(token),
    });
    if (!response.ok) {
        throw new Error(`Failed to load exercises (${response.status})`);
    }
    const data = await response.json();
    return data.exercises ?? [];
}

export async function fetchIndexPrograms(token, patientId) {
    const response = await fetch(`/api/programs?patient_id=${patientId}`, {
        headers: authHeaders(token),
    });
    if (!response.ok) {
        throw new Error(`Failed to load programs (${response.status})`);
    }
    const data = await response.json();
    return data.programs ?? [];
}

// DN-059: Omit patient_id — API uses req.user.id (profile UUID) via fallback.
// Passing session.user.id (auth UUID) caused 0 rows since patient_activity_logs
// stores profile UUIDs; the logs API has no auth_id→users.id resolution.
export async function fetchIndexLogsPage(token, { before = null, limit = INDEX_HISTORY_PAGE_SIZE, includeAll = true } = {}) {
    const params = new URLSearchParams();
    if (includeAll) {
        params.set('include_all', 'true');
    }
    params.set('limit', String(limit));
    if (before) {
        params.set('before', before);
    }

    const response = await fetch(`/api/logs?${params.toString()}`, {
        headers: authHeaders(token),
    });
    if (!response.ok) {
        throw new Error(`Failed to load logs (${response.status})`);
    }
    return response.json();
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
