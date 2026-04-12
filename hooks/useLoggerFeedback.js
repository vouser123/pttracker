// hooks/useLoggerFeedback.js — tracker save/speech feedback for session completion, comparisons, and success copy

import { useCallback, useEffect, useState } from 'react';
import { buildSessionProgress } from '../lib/index-tracker-session';
import { getProgressComparison } from '../lib/logger-progress-comparison';
import { useBrowserSpeech } from './useBrowserSpeech';
// Note: useState kept for allSetsAnnounced only; successMessage removed in favour of useToast

/**
 * @param {Function} showToast - from useToast; used for save-success feedback
 */
export function useLoggerFeedback(selectedExercise, sessionStartedAt, showToast) {
  const [allSetsAnnounced, setAllSetsAnnounced] = useState(false);
  const { ensureSpeechReady, speakText: speakBrowserText } = useBrowserSpeech();

  const speakText = useCallback(
    (text, delayMs = 0) => {
      if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      const speakNow = async () => {
        try {
          await speakBrowserText(text);
        } catch {
          // Speech availability is best-effort only.
        }
      };

      if (delayMs > 0) {
        window.setTimeout(speakNow, delayMs);
        return;
      }

      speakNow();
    },
    [speakBrowserText],
  );

  const maybeAnnounceAllSetsComplete = useCallback(
    (exercise, nextSets) => {
      if (!exercise || allSetsAnnounced) return;
      const nextProgress = buildSessionProgress(exercise, nextSets);
      if (!nextProgress.allComplete) return;
      setAllSetsAnnounced(true);
      speakText('All sets complete', 500);
    },
    [allSetsAnnounced, speakText],
  );

  const announceProgressComparison = useCallback(
    ({ logs, exercise, nextSets, selectedSide = null }) => {
      const comparison = getProgressComparison(
        logs,
        exercise,
        nextSets,
        selectedSide,
        sessionStartedAt,
      );
      if (comparison?.text) {
        speakText(comparison.text, 1500);
      }
    },
    [sessionStartedAt, speakText],
  );

  const announceSessionProgress = useCallback(
    ({ logs, exercise, nextSets, selectedSide = null }) => {
      maybeAnnounceAllSetsComplete(exercise, nextSets);
      announceProgressComparison({ logs, exercise, nextSets, selectedSide });
    },
    [announceProgressComparison, maybeAnnounceAllSetsComplete],
  );

  const showSaveSuccess = useCallback(
    (notesText = '') => {
      const notesStatus = String(notesText).trim() ? 'with notes' : 'no notes';
      showToast(`Saved (${notesStatus})`, 'success');
    },
    [showToast],
  );

  useEffect(() => {
    void selectedExercise?.id;
    void sessionStartedAt;
    setAllSetsAnnounced(false);
  }, [selectedExercise?.id, sessionStartedAt]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const warmSpeech = () => {
      ensureSpeechReady({ warmOnly: true });
    };
    window.addEventListener('pointerup', warmSpeech, { once: true });
    return () => {
      window.removeEventListener('pointerup', warmSpeech);
    };
  }, [ensureSpeechReady]);

  return {
    announceProgressComparison,
    announceSessionProgress,
    maybeAnnounceAllSetsComplete,
    showSaveSuccess,
    speakText,
  };
}
