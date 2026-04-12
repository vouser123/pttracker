// hooks/useRehabCoverageData.js — loads rehab coverage bootstrap data with offline fallback
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJsonWithOffline, isOfflineRequestError } from '../lib/fetch-with-offline';
import { offlineCache } from '../lib/offline-cache';
import { buildCoverageData } from '../lib/rehab-coverage-builder';

function getLoadErrorMessage(error) {
  return error instanceof Error ? error.message : 'Failed to load coverage data.';
}

export function useRehabCoverageData(accessToken) {
  const [userRole, setUserRole] = useState('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coverageResult, setCoverageResult] = useState(null);
  const [offlineNotice, setOfflineNotice] = useState(null);
  const hadAuthRef = useRef(false);

  const reload = useCallback(async () => {
    if (!accessToken) return;

    let cachedSnapshot = null;

    setLoading(true);
    setError(null);
    setOfflineNotice(null);

    try {
      await offlineCache.init();
      const [cachedLogs, cachedRoles] = await Promise.all([
        offlineCache.getCachedLogs(),
        offlineCache.getCachedRolesData(),
      ]);
      if (cachedRoles) {
        cachedSnapshot = {
          userRole: cachedRoles.user_role || 'patient',
          coverageResult: buildCoverageData(cachedLogs || [], cachedRoles.roles || []),
        };
        setUserRole(cachedSnapshot.userRole);
        setCoverageResult(cachedSnapshot.coverageResult);
      }

      const [logsData, rolesData] = await Promise.all([
        fetchJsonWithOffline('/api/logs?limit=1000', {
          token: accessToken,
          errorPrefix: 'Logs API failed',
          offlineMessage: 'Offline - logs unavailable.',
        }),
        fetchJsonWithOffline('/api/roles', {
          token: accessToken,
          errorPrefix: 'Roles API failed',
          offlineMessage: 'Offline - roles unavailable.',
        }),
      ]);

      void offlineCache.cacheLogs(logsData.logs || []);
      void offlineCache.cacheRolesData(rolesData);

      setUserRole(rolesData.user_role || 'patient');
      setCoverageResult(buildCoverageData(logsData.logs || [], rolesData.roles || []));
    } catch (err) {
      console.error('useRehabCoverageData load failed:', err);
      try {
        if (!cachedSnapshot) {
          await offlineCache.init();
          const [cachedLogs, cachedRoles] = await Promise.all([
            offlineCache.getCachedLogs(),
            offlineCache.getCachedRolesData(),
          ]);
          if (!cachedRoles) throw new Error('No cached coverage data available offline.');
          cachedSnapshot = {
            userRole: cachedRoles.user_role || 'patient',
            coverageResult: buildCoverageData(cachedLogs || [], cachedRoles.roles || []),
          };
        }

        setUserRole(cachedSnapshot.userRole);
        setCoverageResult(cachedSnapshot.coverageResult);
        setOfflineNotice(
          isOfflineRequestError(err)
            ? 'Offline — showing cached data.'
            : 'Live coverage refresh failed — showing cached data.',
        );
      } catch (cacheError) {
        console.error('useRehabCoverageData cache fallback failed:', cacheError);
        setError(getLoadErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (typeof window !== 'undefined' && accessToken) {
      void offlineCache.init().catch((cacheError) => {
        console.error('useRehabCoverageData cache init failed:', cacheError);
      });
    }

    if (!accessToken) {
      if (hadAuthRef.current && typeof window !== 'undefined') {
        void Promise.all([
          offlineCache.clearLogs(),
          offlineCache.removeUiState('rehab_roles_data'),
        ]).catch((cacheError) => {
          console.error('useRehabCoverageData cache clear failed:', cacheError);
        });
      }

      setUserRole('patient');
      setCoverageResult(null);
      setOfflineNotice(null);
      setLoading(false);
      setError(null);
      hadAuthRef.current = false;
      return;
    }

    hadAuthRef.current = true;
    reload();
  }, [accessToken, reload]);

  return {
    userRole,
    loading,
    error,
    coverageResult,
    offlineNotice,
    reload,
  };
}
