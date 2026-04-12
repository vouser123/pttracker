// lib/index-sync.js — network sync for the tracker offline session queue
import { buildApiPayload } from './index-offline';

/**
 * Sync a queue of sessions to /api/logs.
 * Each session is POSTed individually. Returns succeeded IDs for caller to remove.
 *
 * @param {Array}  queue        - Sessions to sync
 * @param {string} accessToken  - Supabase access token
 * @returns {Promise<{ succeededIds: string[], failedCount: number, lastError: string|null }>}
 */
export async function syncIndexQueue(queue, accessToken) {
  const succeededIds = [];
  let failedCount = 0;
  let lastError = null;

  for (const session of [...queue]) {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildApiPayload(session)),
      });

      // 200 success or 409 duplicate — either way, remove from queue
      if (res.ok || res.status === 409) {
        succeededIds.push(session.client_mutation_id);
      } else {
        lastError = `Server error: ${res.status}`;
        failedCount++;
      }
    } catch (error) {
      lastError = error?.message || 'Network error';
      failedCount++;
    }
  }

  return { succeededIds, failedCount, lastError };
}
