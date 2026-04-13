// hooks/useSeedSetLogging.js — quick seed-set create path for tracker session logging
import { useCallback } from 'react';
import {
  buildQueuedSessionLogPayload,
  createDefaultSet,
  createSessionLog,
  isBrowserOffline,
  isSessionLogNetworkFailure,
} from '../lib/session-logging';

export function useSeedSetLogging({
  token,
  patientId,
  onSaved,
  onEnqueue,
  setSubmitting,
  setError,
}) {
  return useCallback(
    async (selectedExercise, seedSet, options = {}) => {
      if (!token || !patientId || !selectedExercise) return false;

      const performedAt = options.performedAt ?? new Date().toISOString();
      const sets = [
        {
          ...createDefaultSet(selectedExercise, 1),
          ...(seedSet ?? {}),
          set_number: 1,
          performed_at: performedAt,
        },
      ];

      setSubmitting(true);
      setError(null);

      try {
        if (isBrowserOffline() && onEnqueue) {
          onEnqueue(
            buildQueuedSessionLogPayload(selectedExercise, performedAt, options.notes ?? '', sets),
          );
          if (onSaved) await onSaved();
          return true;
        }

        await createSessionLog(
          token,
          buildQueuedSessionLogPayload(selectedExercise, performedAt, options.notes ?? '', sets),
        );

        if (onSaved) await onSaved();
        return true;
      } catch (error) {
        if (onEnqueue && (isBrowserOffline() || isSessionLogNetworkFailure(error))) {
          onEnqueue(
            buildQueuedSessionLogPayload(selectedExercise, performedAt, options.notes ?? '', sets),
          );
          if (onSaved) await onSaved();
          return true;
        }

        setError(error instanceof Error ? error.message : 'Failed to save session log');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [onEnqueue, onSaved, patientId, setError, setSubmitting, token],
  );
}
