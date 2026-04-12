// lib/pt-view.js — owns pt-view dashboard data reads, transforms, and routine filtering helpers
import { daysBetween } from './date-utils.js';
import { fetchJsonWithOffline } from './fetch-with-offline';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/**
 * Fetch all logs for a patient (up to 1000).
 * @param {string} token
 * @param {string} patientId
 * @returns {Promise<Array>} logs array
 */
export async function fetchLogs(token, patientId) {
  const data = await fetchJsonWithOffline(`/api/logs?patient_id=${patientId}&limit=1000`, {
    token,
    errorPrefix: 'fetchLogs failed',
    offlineMessage: 'Offline - logs unavailable.',
  });
  return data.logs ?? [];
}

/**
 * Fetch the patient's exercise programs.
 * @param {string} token
 * @param {string} patientId
 * @returns {Promise<Array>} programs array
 */
export async function fetchPrograms(token, patientId) {
  const data = await fetchJsonWithOffline(`/api/programs?patient_id=${patientId}`, {
    token,
    errorPrefix: 'fetchPrograms failed',
    offlineMessage: 'Offline - programs unavailable.',
  });
  return data.programs ?? [];
}

function getExerciseLifecycleStatus(exercise) {
  return exercise?.lifecycle?.status ?? exercise?.lifecycle_status ?? 'active';
}

export function isRoutineExercise(exercise) {
  return getExerciseLifecycleStatus(exercise) === 'active';
}

// ---------------------------------------------------------------------------
// Data transforms
// ---------------------------------------------------------------------------

/**
 * Group logs by calendar date (locale date string), sorted newest first.
 *
 * @param {Array} logs
 * @returns {Array<{ dateKey: string, displayDate: string, logs: Array }>}
 */
export function groupLogsByDate(logs) {
  const grouped = {};
  for (const log of logs) {
    const d = new Date(log.performed_at);
    const key = d.toLocaleDateString();
    if (!grouped[key]) {
      grouped[key] = {
        dateKey: key,
        displayDate: d.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        logs: [],
      };
    }
    grouped[key].logs.push(log);
  }
  // Sort descending (newest first)
  return Object.values(grouped).sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey));
}

/**
 * Find prescribed exercises not performed in 7+ days.
 * Sorted by daysSince descending (worst first). Returns up to 10.
 *
 * @param {Array} logs
 * @param {Array} programs - routine programs only
 * @returns {Array<{ exerciseId, exerciseName, daysSince, neverDone }>}
 */
export function findNeedsAttention(logs, programs) {
  // Build map: exerciseId → most recent performed_at date
  const lastDoneMap = {};
  for (const log of logs) {
    const id = log.exercise_id;
    const date = new Date(log.performed_at);
    if (!lastDoneMap[id] || date > lastDoneMap[id]) {
      lastDoneMap[id] = date;
    }
  }

  const now = new Date();
  const overdue = [];

  for (const program of programs) {
    if (!isRoutineExercise(program.exercises)) continue;
    const id = program.exercise_id;
    const name = program.exercise_name ?? program.exercises?.canonical_name ?? id;
    const lastDone = lastDoneMap[id];

    if (!lastDone) {
      overdue.push({ exerciseId: id, exerciseName: name, daysSince: Infinity, neverDone: true });
    } else {
      const daysSince = daysBetween(lastDone, now);
      if (daysSince >= 7) {
        overdue.push({ exerciseId: id, exerciseName: name, daysSince, neverDone: false });
      }
    }
  }

  // Sort worst first, cap at 10
  return overdue.sort((a, b) => b.daysSince - a.daysSince).slice(0, 10);
}

/**
 * Urgency level for a needs-attention item.
 * Returns 'red' | 'orange' | 'yellow'
 *
 * @param {{ daysSince: number, neverDone: boolean }} item
 */
export function needsAttentionUrgency(item) {
  if (item.neverDone || item.daysSince > 14) return 'red';
  if (item.daysSince > 10) return 'orange';
  return 'yellow';
}

/**
 * Compute summary stats for the history dashboard.
 *
 * @param {Array} logs
 * @returns {{ daysActive: number, exercisesCovered: number, totalSessions: number }}
 */
export function computeSummaryStats(logs) {
  const uniqueDays = new Set(logs.map((l) => new Date(l.performed_at).toLocaleDateString()));
  const uniqueExercises = new Set(logs.map((l) => l.exercise_id));
  return {
    daysActive: uniqueDays.size,
    exercisesCovered: uniqueExercises.size,
    totalSessions: logs.length,
  };
}

/**
 * Concerning words — case-insensitive match against log notes.
 * Same list as the vanilla JS page.
 */
const CONCERNING_WORDS = [
  'pain',
  'sharp',
  "couldn't",
  'unable',
  'stopped',
  'worse',
  'difficult',
  'hurt',
  'ache',
  'sore',
  'swelling',
  'tingling',
  'numbness',
];

/**
 * Detect concerning keywords in a note string.
 * @param {string} noteText
 * @returns {string[]} matched words (lowercased, deduped)
 */
export function detectKeywords(noteText) {
  if (!noteText) return [];
  const found = new Set();
  for (const word of CONCERNING_WORDS) {
    if (new RegExp(word, 'i').test(noteText)) found.add(word);
  }
  return [...found];
}

/**
 * Apply client-side filters to a logs array.
 *
 * @param {Array} logs
 * @param {{ exercise: string, dateFrom: string, dateTo: string, query: string }} filters
 * @returns {Array} filtered logs
 */
export function applyFilters(logs, { exercise, dateFrom, dateTo, query }) {
  return logs.filter((log) => {
    if (exercise && log.exercise_id !== exercise) return false;
    if (dateFrom && new Date(log.performed_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(log.performed_at) > new Date(`${dateTo}T23:59:59`)) return false;
    if (query) {
      const q = query.toLowerCase();
      const inName = log.exercise_name?.toLowerCase().includes(q);
      const inNotes = log.notes?.toLowerCase().includes(q);
      if (!inName && !inNotes) return false;
    }
    return true;
  });
}
