// hooks/useSessionLogSubmission.js — session log modal submit transport and offline enqueue flow
import { useCallback } from 'react';
import {
  buildCreatePayload,
  buildQueuedSessionLogPayload,
  createSessionLog,
  inferActivityType,
  isBrowserOffline,
  isSessionLogNetworkFailure,
  normalizeSet,
} from '../lib/session-logging';

export function useSessionLogSubmission({
  token,
  patientId,
  onSaved,
  onEnqueue,
  close,
  setSubmitting,
  setError,
}) {
  return useCallback(
    async ({ exercise, logId, performedAt, notes, sets }) => {
      if (!token || !patientId || !exercise) return false;
      if (sets.length === 0) {
        setError('Add at least one set before saving.');
        return false;
      }

      setSubmitting(true);
      setError(null);

      try {
        const activityType = inferActivityType(exercise);
        const normalizedSets = sets.map((set, index) => normalizeSet(set, index, activityType));

        if (logId) {
          const patchRes = await fetch(`/api/logs?id=${logId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              performed_at: performedAt,
              notes: notes || null,
              sets: normalizedSets,
            }),
          });

          if (!patchRes.ok) {
            throw new Error(`Failed to update log (${patchRes.status})`);
          }
        } else {
          const createPayload = buildCreatePayload(exercise, performedAt, notes, normalizedSets);

          if (isBrowserOffline() && onEnqueue) {
            onEnqueue(createPayload);
            if (onSaved) await onSaved();
            close();
            return true;
          }

          await createSessionLog(token, createPayload);
        }

        if (onSaved) await onSaved();
        close();
        return true;
      } catch (error) {
        if (!logId && onEnqueue) {
          if (isBrowserOffline() || isSessionLogNetworkFailure(error)) {
            onEnqueue(buildQueuedSessionLogPayload(exercise, performedAt, notes, sets));
            if (onSaved) await onSaved();
            close();
            return true;
          }
        }

        setError(error instanceof Error ? error.message : 'Failed to save session log');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [close, onEnqueue, onSaved, patientId, setError, setSubmitting, token],
  );
}
