/**
 * Shared Supabase client — single instance used by all Next.js pages and hooks.
 *
 * Do NOT call createClient() anywhere else in the Next.js app.
 * All pages import { supabase } from here.
 *
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are forwarded from
 * SUPABASE_URL and SUPABASE_ANON_KEY by next.config.mjs — no extra Vercel vars needed.
 */
import { createClient } from '@supabase/supabase-js';
import { authStorage } from './offline-cache';

let cachedSupabaseClient = null;

function getSupabaseClient() {
    if (cachedSupabaseClient) {
        return cachedSupabaseClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase client env is missing. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    cachedSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: authStorage,
        },
    });

    return cachedSupabaseClient;
}

export const supabase = new Proxy(
    {},
    {
        get(_target, property) {
            if (property === 'then') {
                return undefined;
            }
            return getSupabaseClient()[property];
        },
    }
);
