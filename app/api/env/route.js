// app/api/env/route.js — Returns Supabase public config for client bootstrap. No auth required.

export async function GET() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return Response.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
    }

    return Response.json({ supabaseUrl, supabaseAnonKey });
}
