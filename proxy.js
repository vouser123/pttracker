/**
 * proxy.js — Supabase session refresh proxy (required by @supabase/ssr).
 *
 * Refreshes the session cookie on every request so server components and layouts
 * always see a current session. Does NOT redirect — auth gating is handled at
 * the app/(protected)/layout.js level.
 *
 * Named "proxy" per Next.js 16 convention (previously "middleware").
 *
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function proxy(request) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Required: validates the JWT locally and refreshes the session token if
    // expired, then writes updated cookies to both the request and response.
    // Use getClaims() here, NOT getUser() — the proxy's only job is token
    // refresh + cookie propagation. getUser() adds an unnecessary network
    // round-trip to the Supabase auth server on every request. getClaims() is
    // a local JWT check that still triggers the refresh mechanism.
    // Auth gating (user identity verification) is handled in layout.js via getUser().
    // See: https://supabase.com/docs/guides/auth/server-side/nextjs
    await supabase.auth.getClaims();

    return supabaseResponse;
}

export const config = {
    matcher: [
        // Skip Next.js internals, static assets, and api routes (handled separately).
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
