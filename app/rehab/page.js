// app/rehab/page.js — App Router entry for /rehab.
// Server Component: exports metadata; delegates all rendering to RehabPage (client).
// This file takes precedence over pages/rehab.js for the /rehab route.

import RehabPage from './RehabPage';

export const metadata = {
    title: 'Rehab Coverage Analysis',
};

export default function RehabRoute() {
    return <RehabPage />;
}
