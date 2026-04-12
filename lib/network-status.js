// lib/network-status.js — shared browser and request-evidence connectivity state for offline-aware app flows.

const NETWORK_FAILURE_WINDOW_MS = 15000;

let browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
let lastConfirmedOnlineAt = browserOnline ? Date.now() : 0;
let lastNetworkFailureAt = 0;
let failureReason = browserOnline ? null : 'browser_offline';
let listenersBound = false;

const subscribers = new Set();

function buildSnapshot() {
  const now = Date.now();
  const hasRecentFailure =
    lastNetworkFailureAt > 0 && now - lastNetworkFailureAt <= NETWORK_FAILURE_WINDOW_MS;
  const effectiveOffline = browserOnline === false || hasRecentFailure;
  const reason =
    browserOnline === false
      ? 'browser_offline'
      : hasRecentFailure
        ? (failureReason ?? 'network_failure')
        : null;

  return {
    browserOnline,
    effectiveOnline: !effectiveOffline,
    effectiveOffline,
    reason,
    lastConfirmedOnlineAt,
    lastNetworkFailureAt,
  };
}

let currentSnapshot = buildSnapshot();

function refreshSnapshot() {
  const nextSnapshot = buildSnapshot();
  if (
    currentSnapshot.browserOnline === nextSnapshot.browserOnline &&
    currentSnapshot.effectiveOnline === nextSnapshot.effectiveOnline &&
    currentSnapshot.effectiveOffline === nextSnapshot.effectiveOffline &&
    currentSnapshot.reason === nextSnapshot.reason &&
    currentSnapshot.lastConfirmedOnlineAt === nextSnapshot.lastConfirmedOnlineAt &&
    currentSnapshot.lastNetworkFailureAt === nextSnapshot.lastNetworkFailureAt
  ) {
    return currentSnapshot;
  }

  currentSnapshot = nextSnapshot;
  return currentSnapshot;
}

function emitChange() {
  const previousSnapshot = currentSnapshot;
  const nextSnapshot = refreshSnapshot();
  if (previousSnapshot === nextSnapshot) return;

  for (const listener of subscribers) {
    listener();
  }
}

function syncBrowserOnlineState() {
  if (typeof navigator === 'undefined') return browserOnline;

  const nextBrowserOnline = navigator.onLine !== false;
  if (nextBrowserOnline === browserOnline) return browserOnline;

  browserOnline = nextBrowserOnline;
  if (browserOnline) {
    if (
      lastNetworkFailureAt === 0 ||
      Date.now() - lastNetworkFailureAt > NETWORK_FAILURE_WINDOW_MS
    ) {
      failureReason = null;
    }
  } else {
    failureReason = 'browser_offline';
  }

  emitChange();
  return browserOnline;
}

function bindBrowserListeners() {
  if (listenersBound || typeof window === 'undefined') return;

  listenersBound = true;
  window.addEventListener('online', () => {
    browserOnline = true;
    if (
      lastNetworkFailureAt === 0 ||
      Date.now() - lastNetworkFailureAt > NETWORK_FAILURE_WINDOW_MS
    ) {
      failureReason = null;
    }
    emitChange();
  });
  window.addEventListener('offline', () => {
    browserOnline = false;
    failureReason = 'browser_offline';
    emitChange();
  });
}

export function isNetworkUnavailableError(error) {
  if (!error) return false;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  const name = String(error?.name ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();

  return (
    name === 'networkerror' ||
    name === 'typeerror' ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('networkerror') ||
    message.includes('fetch failed') ||
    message.includes('network error')
  );
}

export function markNetworkFailure(error) {
  if (!isNetworkUnavailableError(error)) return false;

  syncBrowserOnlineState();
  lastNetworkFailureAt = Date.now();
  failureReason = browserOnline ? 'network_failure' : 'browser_offline';
  emitChange();
  return true;
}

export function markNetworkSuccess() {
  browserOnline = true;
  lastConfirmedOnlineAt = Date.now();
  failureReason = null;
  emitChange();
}

export function getNetworkStatusSnapshot() {
  syncBrowserOnlineState();
  return refreshSnapshot();
}

export function isEffectivelyOffline() {
  return getNetworkStatusSnapshot().effectiveOffline;
}

export function subscribeToNetworkStatus(listener) {
  bindBrowserListeners();
  subscribers.add(listener);

  return () => {
    subscribers.delete(listener);
  };
}
