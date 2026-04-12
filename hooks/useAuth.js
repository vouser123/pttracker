// hooks/useAuth.js — shared auth session lifecycle and browser-side sign-in helpers.
/**
 * useAuth — shared authentication hook for all Next.js pages.
 *
 * Handles session initialization, auth state changes, sign-in, and sign-out.
 * Every page that requires auth uses this hook instead of calling Supabase directly.
 *
 * Usage:
 *   const { session, loading, signIn, signOut } = useAuth();
 *
 * @returns {{
 *   session: object|null,   Supabase session (has .user and .access_token)
 *   loading: boolean,       true until the initial session check resolves
 *   signIn: function,       (email, password) => Promise<string|null> — error msg or null
 *   signOut: function,      () => Promise<void>
 * }}
 */
import { useEffect, useState } from 'react';
import {
  isEffectivelyOffline,
  isNetworkUnavailableError,
  markNetworkFailure,
  markNetworkSuccess,
} from '../lib/network-status';
import { offlineCache } from '../lib/offline-cache';
import { supabase } from '../lib/supabase';

function persistAuthUserId(userId) {
  if (typeof window === 'undefined') return;
  void offlineCache.setAuthState('auth_user_id', userId);
}

function clearAuthUserId() {
  if (typeof window === 'undefined') return;
  void offlineCache.removeAuthState('auth_user_id');
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session on mount (handles page reload + return from OAuth).
    // Supabase auth persistence is backed by the shared IndexedDB storage adapter.
    //
    // getSession() trusts whatever is stored in IndexedDB without a server round-trip.
    // A stored session can be stale if the password was reset or the token was revoked
    // server-side. Restore the stored session immediately so offline-capable pages can
    // bootstrap from cache first, then validate with getUser() in the background. If
    // validation fails for a non-network reason, sign out to clear the stale session
    // and let the page fall through to AuthForm.
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      if (!sess) {
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(sess);
      persistAuthUserId(sess.user.id);
      setLoading(false);

      const { error: userError } = await supabase.auth.getUser();
      if (!userError) {
        markNetworkSuccess();
        return;
      }

      if (markNetworkFailure(userError)) {
        // Network is down — keep the locally-restored session active and let
        // page-level data hooks decide whether to use cached or fresh data.
        return;
      }

      // Supabase refresh token errors (400 Invalid Refresh Token) occur when the
      // token was rotated by another tab or SW instance. If we're offline we can't
      // distinguish a genuinely revoked token from a network-blocked refresh, so
      // keep the session alive and let the user continue with cached data.
      const isRefreshTokenError =
        userError.message?.includes('refresh_token') ||
        userError.message?.includes('Refresh Token');
      if (isRefreshTokenError && isEffectivelyOffline()) {
        return;
      }

      // Token is actually invalid (revoked, password changed, etc.)
      // Sign out to clear stale IndexedDB state and prompt re-login.
      await supabase.auth.signOut();
      clearAuthUserId();
      setSession(null);
    });

    // Keep session state in sync with Supabase auth events.
    // Only clear session on an explicit SIGNED_OUT event — not on transient null
    // values that can occur during token refresh cycles.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_OUT') {
        // A SIGNED_OUT event while offline is almost certainly a failed background
        // token refresh, not an explicit sign-out. Clearing the session offline
        // wipes the users IDB store and destroys offline data. Ignore it.
        if (isEffectivelyOffline()) return;
        clearAuthUserId();
        setSession(null);
      } else if (sess) {
        markNetworkSuccess();
        persistAuthUserId(sess.user.id);
        setSession(sess);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign in with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<string|null>} error message, or null on success
   */
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      markNetworkSuccess();
      return null;
    }

    if (isNetworkUnavailableError(error)) {
      markNetworkFailure(error);
      return 'Signing in requires an internet connection. If you already signed in on this device before going offline, reopen the app and it should restore your saved session.';
    }

    return error.message;
  }

  /** Sign out the current user and redirect to sign-in. */
  async function signOut() {
    await supabase.auth.signOut();
    clearAuthUserId();
    window.location.href = '/sign-in';
  }

  return { session, loading, signIn, signOut };
}
