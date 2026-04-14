// hooks/useReferenceData.js — fetches /api/reference-data; returns equipment, muscles, formParameters, formParameterMetadata.
import { useEffect, useState } from 'react';
import { fetchReferenceData } from '../lib/pt-editor.js';

/**
 * Fetches reference data (equipment, muscles, form parameters, form parameter metadata).
 * Used by any route that needs display configuration for form parameters.
 * Re-fetches when token changes.
 *
 * @param {string|null} token - Access token from useAuth
 * @returns {{ referenceData: object, loading: boolean, error: string|null }}
 */
export function useReferenceData(token) {
  const [referenceData, setReferenceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    fetchReferenceData(token)
      .then((data) => {
        if (!cancelled) {
          setReferenceData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load reference data');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { referenceData, loading, error };
}
