/**
 * Shared Supabase client — single instance used by all Next.js pages and hooks.
 *
 * Uses @supabase/ssr createBrowserClient so the session is stored in cookies and
 * is server-readable by layouts and server components.
 *
 * Do NOT call createBrowserClient() anywhere else. Import { supabase } from here.
 *
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are forwarded from
 * SUPABASE_URL and SUPABASE_ANON_KEY by next.config.mjs — no extra Vercel vars needed.
 */
import { getBrowserSupabaseClient } from './supabase-browser';

export const supabase = new Proxy(
    {},
    {
        get(_target, property) {
            if (property === 'then') {
                return undefined;
            }
            return getBrowserSupabaseClient()[property];
        },
    }
);
