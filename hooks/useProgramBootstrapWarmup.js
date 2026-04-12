// hooks/useProgramBootstrapWarmup.js — warms /program bootstrap caches from protected-route visits
import { useEffect, useRef } from 'react';
import { isEffectivelyOffline } from '../lib/network-status';
import { warmProgramBootstrapCache } from '../lib/program-bootstrap-warmup';

/**
 * Warm the /program bootstrap cache from any authenticated protected-route visit.
 *
 * PT-office use can start from tracker or another authenticated route, then lose
 * signal before /program is opened. This hook fills missing editor bootstrap
 * caches online so /program can cold-open offline later.
 */
export function useProgramBootstrapWarmup({ session }) {
  const syncInFlightRef = useRef(null);

  useEffect(() => {
    async function runWarmProgramBootstrap() {
      if (typeof window === 'undefined' || isEffectivelyOffline()) return;
      if (!session?.access_token || !session.user?.id) return;

      const activeWarm = syncInFlightRef.current;
      if (activeWarm?.authUserId === session.user.id) {
        return activeWarm.promise;
      }

      const run = (async () => {
        await warmProgramBootstrapCache({
          accessToken: session.access_token,
          authUserId: session.user.id,
        });
      })().catch((error) => {
        console.error('useProgramBootstrapWarmup failed:', error);
      });

      const trackedRun = run.finally(() => {
        if (syncInFlightRef.current?.promise === trackedRun) {
          syncInFlightRef.current = null;
        }
      });

      syncInFlightRef.current = {
        authUserId: session.user.id,
        promise: trackedRun,
      };

      return trackedRun;
    }

    void runWarmProgramBootstrap();

    function handleOnline() {
      void runWarmProgramBootstrap();
    }

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [session]);
}
