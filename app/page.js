// app/page.js — App Router entry for the tracker home route.
// Server Component: exports metadata; delegates rendering to TrackerPage (client).

import TrackerPage from './TrackerPage';

export const metadata = {
    title: 'PT Tracker',
};

export default function HomeRoute() {
    return <TrackerPage />;
}
