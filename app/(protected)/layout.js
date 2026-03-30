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
import { redirect } from 'next/navigation';
import { getServerUser } from '../../lib/server-user';
import ProtectedClientWarmers from './ProtectedClientWarmers';

export default async function ProtectedLayout({ children }) {
    const user = await getServerUser();
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
