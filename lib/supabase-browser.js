/**
 * lib/supabase-browser.js — Browser-side Supabase client using @supabase/ssr.
 *
 * createBrowserClient stores the session in cookies, making it server-readable.
 * This is the only place a browser Supabase client should be created.
 *
 * Usage: import { getBrowserSupabaseClient } from './supabase-browser';
 * Most code should import { supabase } from './supabase' instead (same client, proxy wrapper).
 */
import { createBrowserClient } from '@supabase/ssr';

let cachedBrowserClient = null;

export function getBrowserSupabaseClient() {
    if (cachedBrowserClient) return cachedBrowserClient;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase env missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required.');
    }

    cachedBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return cachedBrowserClient;
}
