// hooks/useAllUsers.js — fetches and maintains the full users list for the active session
import { useEffect, useState } from 'react';
import { fetchUsers } from '../lib/users';

/**
 * Single concern: keep the live users list in sync with the session.
 * Used to bootstrap patient selection before program data is loaded.
 */
export function useAllUsers({ session }) {
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    fetchUsers(session.access_token).then((users) => {
      if (!cancelled) setAllUsers(users);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  return { allUsers };
}
