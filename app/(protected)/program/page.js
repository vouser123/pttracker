// app/(protected)/program/page.js — App Router entry for /program.
// Server Component: exports metadata; delegates rendering to ProgramPage (client).

import { getServerUser } from '../../../lib/server-user';
import ProgramPage from './ProgramPage';

export const metadata = {
    title: 'PT Editor - Exercise Library Manager',
};

export default async function ProgramRoute() {
    const user = await getServerUser();

    return <ProgramPage initialAuthUserId={user?.id ?? null} />;
}
