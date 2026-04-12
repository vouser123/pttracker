// hooks/useEffectiveConnectivity.js — React subscription hook for shared browser and request-evidence connectivity state.

import { useSyncExternalStore } from 'react';
import { getNetworkStatusSnapshot, subscribeToNetworkStatus } from '../lib/network-status';

const serverSnapshot = () => ({
  browserOnline: true,
  effectiveOnline: true,
  effectiveOffline: false,
  reason: null,
  lastConfirmedOnlineAt: 0,
  lastNetworkFailureAt: 0,
});

export function useEffectiveConnectivity() {
  return useSyncExternalStore(subscribeToNetworkStatus, getNetworkStatusSnapshot, serverSnapshot);
}
