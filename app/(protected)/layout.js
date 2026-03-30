/**
 * app/(protected)/layout.js — Server-side auth gate for all protected routes.
 *
 * Reads the session from cookies via @supabase/ssr. If no authenticated user
 * is found, redirects to /sign-in before any client bundle is sent.
 *
 * React.cache() deduplicates the getUser() call within a single request so
 * sibling server components do not re-fetch independently.
 *
 * Client components within protected routes still use useAuth() for client-side
 * session management and sign-out flows — this layout is additive, not a replacement.
 */
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '../../lib/supabase-server';
import ProtectedClientWarmers from './ProtectedClientWarmers';

const getUser = cache(async () => {
    const supabase = await getServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
});

export default async function ProtectedLayout({ children }) {
    const user = await getUser();
    if (!user) {
        redirect('/sign-in');
    }
    return (
        <>
            <ProtectedClientWarmers />
            {children}
        </>
    );
}
