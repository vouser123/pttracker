'use client';
// app/~offline/page.js — Offline fallback page served by the service worker
// when a navigation request fails and no cached version is available.
// No auth, no data fetching — purely static.

export default function OfflinePage() {
    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h1>You&apos;re offline</h1>
            <p>PT Tracker is not available right now. Please check your connection and reload.</p>
            <p style={{ marginTop: '1rem' }}>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    style={{ padding: '0.75rem 1.5rem', cursor: 'pointer' }}
                >
                    Try again
                </button>
            </p>
        </main>
    );
}
