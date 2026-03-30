// lib/route-auth.js — Auth helpers for App Router route handlers (Web Request API).
// NOT an adapter over lib/auth.js — a clean re-implementation for the Request/Response API.

import { getSupabaseClient, getSupabaseAdmin } from './db.js';

/**
 * Authenticate a Web Request via Bearer JWT.
 * Returns { user, accessToken, error } — never throws.
 *
 * @param {Request} request
 * @returns {Promise<{ user: object|null, accessToken: string|null, error: string|null }>}
 */
export async function authenticateRoute(request) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null, accessToken: null, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.slice(7);

    try {
        const supabase = getSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return { user: null, accessToken: null, error: authError?.message || 'Invalid token' };
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, role, therapist_id')
            .eq('auth_id', user.id)
            .single();

        if (userError || !userData) {
            return { user: null, accessToken: null, error: 'User not found in database' };
        }

        return {
            user: {
                id: userData.id,
                auth_id: user.id,
                email: user.email,
                role: userData.role,
                therapist_id: userData.therapist_id,
            },
            accessToken: token,
            error: null,
        };
    } catch (err) {
        return { user: null, accessToken: null, error: err.message };
    }
}

/** 401 Response helper */
export function unauthorized(message = 'Unauthorized') {
    return Response.json({ error: message }, { status: 401 });
}

/** 403 Response helper */
export function forbidden(message = 'Forbidden') {
    return Response.json({ error: message }, { status: 403 });
}

/** 405 Response helper */
export function methodNotAllowed() {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

/** 400 Response helper */
export function badRequest(message) {
    return Response.json({ error: message }, { status: 400 });
}

/** 500 Response helper */
export function serverError(message = 'Internal server error', err = null) {
    return Response.json({
        error: message,
        details: process.env.NODE_ENV === 'development' && err ? err.message : undefined,
    }, { status: 500 });
}
