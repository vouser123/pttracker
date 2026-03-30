// app/(protected)/program/page.js — App Router entry for /program.
// Server Component: exports metadata; delegates rendering to ProgramPage (client).

import { getServerSupabaseClient } from '../../../lib/supabase-server';
import ProgramPage from './ProgramPage';

export const metadata = {
    title: 'PT Editor - Exercise Library Manager',
};

export default async function ProgramRoute() {
    const supabase = await getServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    return <ProgramPage initialAuthUserId={user?.id ?? null} />;
}
