// hooks/useUserContext.js — owns user-context lifecycle, cache restore, and live refresh
import { useEffect, useRef, useState } from 'react';
import {
  isEffectivelyOffline,
  isNetworkUnavailableError,
  markNetworkFailure,
  markNetworkSuccess,
} from '../lib/network-status';
import { offlineCache } from '../lib/offline-cache';
import { deriveUserContextState, fetchUsers } from '../lib/users';

/** @returns {ReturnType<typeof getDefaultState>} */
function getDefaultState() {
  return {
    profileId: null,
    patientId: null,
    recipientId: null,
    userRole: 'patient',
    emailEnabled: true,
    viewerName: '',
    otherName: '',
    otherIsTherapist: false,
    loading: true,
    error: null,
  };
}

/**
 * @param {import('@supabase/supabase-js').Session|null} session
 * @returns {ReturnType<typeof getDefaultState>}
 */
export function useUserContext(session) {
  const [state, setState] = useState(getDefaultState);
  const hadSessionRef = useRef(false);

  useEffect(() => {
    if (!session) {
      // Only clear user cache on actual sign-out (session was previously set),
      // not on the initial null-session render before auth resolves. Clearing
      // on initial mount destroys the offline fallback: the IDB readwrite
      // transaction serializes ahead of the subsequent readonly getCachedUsers(),
      // so the users store is empty by the time the auth-resolved effect reads it.
      if (hadSessionRef.current) {
        void offlineCache
          .init()
          .then(() => offlineCache.clearStore('users'))
          .catch((err) => console.error('useUserContext cache clear failed:', err));
      }
      setState({ ...getDefaultState(), loading: false });
      return;
    }

    hadSessionRef.current = true;
    let cancelled = false;

    async function load() {
      let cachedContext = null;

      try {
        await offlineCache.init();

        const cachedUsers = await offlineCache.getCachedUsers();
        if (cachedUsers.length) {
          try {
            cachedContext = deriveUserContextState(cachedUsers, session.user.id);
            if (!cancelled) {
              setState(cachedContext);
            }
          } catch {
            cachedContext = null;
          }
        }

        if (isEffectivelyOffline()) {
          if (cachedContext) return;
          throw new Error('Offline - cached user context unavailable.');
        }

        const users = await fetchUsers(session.access_token);
        markNetworkSuccess();

        // Cache users for offline fallback (consumed by usePtViewData offline path)
        await offlineCache.cacheUsers(users);

        if (cancelled) return;
        setState(deriveUserContextState(users, session.user.id));
      } catch (err) {
        if (cancelled) return;
        markNetworkFailure(err);

        if (cachedContext && isNetworkUnavailableError(err)) {
          return;
        }

        // Try offline cache fallback
        try {
          const cached = await offlineCache.getCachedUsers();
          if (cached.length) {
            setState(deriveUserContextState(cached, session.user.id));
            return;
          }
        } catch {
          // Cache also failed — fall through to error state
        }

        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return state;
}
