// hooks/useBrowserSpeech.js — speech synthesis readiness and queue helpers for tracker feedback

import { useCallback, useRef } from 'react';

export function useBrowserSpeech() {
  const speechWarmPromiseRef = useRef(null);
  const speechWarmedRef = useRef(false);

  const ensureSpeechReady = useCallback(async ({ warmOnly = false } = {}) => {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
      const synth = window.speechSynthesis;
      if (typeof synth.resume === 'function') {
        synth.resume();
      }

      if (speechWarmedRef.current) {
        return synth;
      }

      const voices = synth.getVoices();
      if (voices.length > 0 && !warmOnly) {
        speechWarmedRef.current = true;
        return synth;
      }

      if (!speechWarmPromiseRef.current) {
        speechWarmPromiseRef.current = new Promise((resolve) => {
          let settled = false;

          const settle = () => {
            if (settled) return;
            settled = true;
            synth.removeEventListener?.('voiceschanged', handleVoicesChanged);
            resolve(synth);
          };

          const handleVoicesChanged = () => {
            if (synth.getVoices().length > 0) {
              speechWarmedRef.current = true;
            }
            settle();
          };

          synth.addEventListener?.('voiceschanged', handleVoicesChanged);

          if (warmOnly && !speechWarmedRef.current) {
            try {
              const warmUtterance = new SpeechSynthesisUtterance('.');
              warmUtterance.volume = 0;
              warmUtterance.rate = 10;
              warmUtterance.pitch = 1;
              warmUtterance.onend = () => {
                speechWarmedRef.current = true;
                settle();
              };
              warmUtterance.onerror = settle;
              synth.cancel();
              synth.speak(warmUtterance);
            } catch {
              settle();
            }
          }

          window.setTimeout(
            () => {
              if (!speechWarmedRef.current && synth.getVoices().length > 0) {
                speechWarmedRef.current = true;
              }
              settle();
            },
            warmOnly ? 300 : 800,
          );
        }).finally(() => {
          speechWarmPromiseRef.current = null;
        });
      }

      await speechWarmPromiseRef.current;
      return synth;
    } catch {
      speechWarmPromiseRef.current = null;
      return null;
    }
  }, []);

  const speakText = useCallback(
    async (text) => {
      try {
        if (!text) return;
        const synth = await ensureSpeechReady();
        if (!synth) return;
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        synth.speak(utterance);
      } catch {
        // Speech availability is best-effort only.
      }
    },
    [ensureSpeechReady],
  );

  const clearSpeechQueue = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Speech availability is best-effort only.
    }
  }, []);

  return {
    ensureSpeechReady,
    speakText,
    clearSpeechQueue,
  };
}
