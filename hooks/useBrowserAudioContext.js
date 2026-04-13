// hooks/useBrowserAudioContext.js — Web Audio readiness and beep playback helpers for tracker cues

import { useCallback, useRef } from 'react';

export function useBrowserAudioContext() {
  const audioContextRef = useRef(null);
  const audioResumePromiseRef = useRef(null);

  const ensureAudioReady = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioContextRef.current = new Ctx();
      }
      const context = audioContextRef.current;
      if (!context) return null;

      if (context.state === 'suspended') {
        if (!audioResumePromiseRef.current) {
          const resumeWithTimeout = Promise.race([
            Promise.resolve(context.resume()),
            new Promise((resolve) => window.setTimeout(resolve, 1000)),
          ]);
          audioResumePromiseRef.current = resumeWithTimeout
            .catch(() => null)
            .finally(() => {
              audioResumePromiseRef.current = null;
            });
        }
        await audioResumePromiseRef.current;
      }
      return context;
    } catch {
      audioContextRef.current = null;
      audioResumePromiseRef.current = null;
      return null;
    }
  }, []);

  const playBeep = useCallback(
    async (frequency = 800, duration = 200, gain = 0.4) => {
      try {
        const context = await ensureAudioReady();
        if (!context || context.state !== 'running') return;

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'square';

        const durationInSeconds = duration / 1000;
        gainNode.gain.setValueAtTime(gain, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + durationInSeconds);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + durationInSeconds);
      } catch {
        // Audio availability is best-effort only.
      }
    },
    [ensureAudioReady],
  );

  return {
    ensureAudioReady,
    playBeep,
  };
}
