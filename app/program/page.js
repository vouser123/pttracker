// app/program/page.js — App Router entry for /program.
// Server Component: exports metadata; delegates rendering to ProgramPage (client).

import ProgramPage from './ProgramPage';

export const metadata = {
    title: 'PT Editor - Exercise Library Manager',
};

export default function ProgramRoute() {
    return <ProgramPage />;
}
