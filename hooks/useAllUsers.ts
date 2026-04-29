// hooks/useAllUsers.js — fetches and maintains the full users list for the active session
import { useEffect, useState } from 'react';
import { fetchUsers } from '../lib/users';
import type { AuthSessionLike, UserLike } from './program-route-types';

/**
 * Single concern: keep the live users list in sync with the session.
 * Used to bootstrap patient selection before program data is loaded.
 */
export function useAllUsers({ session }: { session: AuthSessionLike | null }) {
  const [allUsers, setAllUsers] = useState<UserLike[]>([]);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    fetchUsers(session.access_token).then((users: UserLike[]) => {
      if (!cancelled) setAllUsers(users);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  return { allUsers };
}
