/**
 * lib/server-user.js — Shared React.cache wrapper for server-side auth user lookup.
 *
 * React.cache() deduplicates the getUser() call within a single request so
 * the protected layout and any server component (e.g. /program/page.js) that
 * both need the auth user share one Supabase round-trip instead of two.
 *
 * Only call from Server Components or server-side logic (not client components).
 */
import { cache } from 'react';
import { getServerSupabaseClient } from './supabase-server';

export const getServerUser = cache(async () => {
    const supabase = await getServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
});
