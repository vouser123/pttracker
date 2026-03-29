// app/(protected)/pt-view/page.js — App Router entry for /pt-view.
// Server Component: exports metadata; delegates all rendering to PtViewPage (client).

import PtViewPage from './PtViewPage';

export const metadata = {
    title: 'Rehab History',
};

export default function PtViewRoute() {
    return <PtViewPage />;
}
