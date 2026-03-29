/**
 * lib/supabase-server.js — Server-side Supabase client using @supabase/ssr.
 *
 * createServerClient reads the session from cookies, enabling server-side
 * auth checks in layouts, server components, and API routes.
 *
 * Usage: const supabase = await getServerSupabaseClient();
 * Only call from Server Components, layouts, or server-side logic (not client components).
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getServerSupabaseClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        }
    );
}
