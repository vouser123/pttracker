// hooks/useFormParameterActions.js — optimistic CRUD actions for form_parameter_metadata.
import { useCallback, useEffect, useState } from 'react';

async function apiFetch(url, method, body, accessToken) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Manages form_parameter_metadata CRUD with optimistic local state.
 * Initial items loaded from /api/form-parameter-metadata on mount.
 *
 * @param {string|null} accessToken
 * @returns {{ items, saving, error, handleAdd, handleUpdate, handleDelete }}
 */
export function useFormParameterActions(accessToken) {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch('/api/form-parameter-metadata', 'GET', undefined, accessToken)
      .then((data) => setItems(data.items ?? []))
      .catch((err) => setError(err.message));
  }, [accessToken]);

  const handleAdd = useCallback(
    async ({ parameter_name, display_suffix, unit_options }) => {
      setError(null);
      setSaving(true);
      const optimistic = {
        parameter_name,
        display_suffix: display_suffix ?? null,
        unit_options: unit_options ?? null,
      };
      setItems((prev) => [...prev, optimistic]);
      try {
        const { item } = await apiFetch(
          '/api/form-parameter-metadata',
          'POST',
          { parameter_name, display_suffix, unit_options },
          accessToken,
        );
        setItems((prev) => prev.map((i) => (i.parameter_name === parameter_name ? item : i)));
      } catch (err) {
        setItems((prev) => prev.filter((i) => i.parameter_name !== parameter_name));
        setError(err.message);
      } finally {
        setSaving(false);
      }
    },
    [accessToken],
  );

  const handleUpdate = useCallback(
    async ({ parameter_name, display_suffix, unit_options }) => {
      setError(null);
      setSaving(true);
      setItems((prev) =>
        prev.map((i) =>
          i.parameter_name === parameter_name
            ? { ...i, display_suffix: display_suffix ?? null, unit_options: unit_options ?? null }
            : i,
        ),
      );
      try {
        await apiFetch(
          '/api/form-parameter-metadata',
          'PUT',
          { parameter_name, display_suffix, unit_options },
          accessToken,
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    },
    [accessToken],
  );

  const handleDelete = useCallback(
    async (parameter_name) => {
      setError(null);
      setSaving(true);
      setItems((prev) => prev.filter((i) => i.parameter_name !== parameter_name));
      try {
        await apiFetch(
          `/api/form-parameter-metadata?parameter_name=${encodeURIComponent(parameter_name)}`,
          'DELETE',
          undefined,
          accessToken,
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    },
    [accessToken],
  );

  return { items, saving, error, handleAdd, handleUpdate, handleDelete };
}
