// hooks/useTimerAudio.js — audio and speech side effects for exercise execution feedback

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useBrowserAudioContext } from './useBrowserAudioContext';
import { useBrowserSpeech } from './useBrowserSpeech';

export function useTimerAudio() {
  const { ensureAudioReady, playBeep } = useBrowserAudioContext();
  const { ensureSpeechReady, speakText, clearSpeechQueue } = useBrowserSpeech();
  const effectQueueRef = useRef(Promise.resolve());

  const waitForTimeout = useCallback(
    (delayMs) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, delayMs);
      }),
    [],
  );

  const playCompletionSound = useCallback(async () => {
    await playBeep(1000, 150);
    await waitForTimeout(200);
    await playBeep(1200, 150);
    await waitForTimeout(200);
    await playBeep(1400, 200);
  }, [playBeep, waitForTimeout]);

  const runEffect = useCallback(
    async (effect) => {
      switch (effect.type) {
        case 'ensure_audio_ready':
          await ensureAudioReady();
          await ensureSpeechReady({ warmOnly: true });
          break;
        case 'play_soft_tick':
          await playBeep(440, 80, 0.25);
          break;
        case 'play_start_confirm':
          await playBeep(520, 90, 0.3);
          break;
        case 'play_countdown_warning':
          await playBeep(600, 100, 0.35);
          break;
        case 'play_completion_triple':
          await playCompletionSound();
          break;
        case 'play_partial_confirm':
          await playBeep(500, 150, 0.4);
          break;
        case 'clear_speech_queue':
          clearSpeechQueue();
          break;
        case 'speak_text':
          if (effect.text) await speakText(effect.text);
          break;
        default:
          break;
      }
    },
    [
      clearSpeechQueue,
      ensureAudioReady,
      ensureSpeechReady,
      playBeep,
      playCompletionSound,
      speakText,
    ],
  );

  const executeEffects = useCallback(
    (effects = []) => {
      effectQueueRef.current = effectQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          for (const effect of effects) {
            // Preserve cue order so warm-up completes before the next sound or spoken prompt.
            await runEffect(effect);
          }
        });
      return effectQueueRef.current;
    },
    [runEffect],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const warmMedia = () => {
      executeEffects([{ type: 'ensure_audio_ready' }]);
    };
    window.addEventListener('pointerup', warmMedia, { once: true });
    return () => {
      window.removeEventListener('pointerup', warmMedia);
    };
  }, [executeEffects]);

  return useMemo(
    () => ({
      ensureAudioReady,
      ensureSpeechReady,
      playBeep,
      playCompletionSound,
      speakText,
      clearSpeechQueue,
      executeEffects,
    }),
    [
      clearSpeechQueue,
      ensureAudioReady,
      ensureSpeechReady,
      executeEffects,
      playBeep,
      playCompletionSound,
      speakText,
    ],
  );
}
