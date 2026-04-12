// components/OfflineQueueBanner.js — persistent offline/syncing state indicator for all pages

/**
 * OfflineQueueBanner — persistent indicator for offline/syncing state
 *
 * Displays pending queue state similar to ProgramPage banner.
 * Unifies how tracker and program show offline changes.
 *
 * Props:
 *   - queue: Array of pending items
 *   - syncing: boolean, currently syncing
 *   - queueError: string|null, error message if any items failed
 *   - queueLoaded: boolean, queue fully hydrated
 *   - label: string, what items are being synced (e.g., "exercise change" or "session")
 */

export default function OfflineQueueBanner({
  queue = [],
  syncing = false,
  queueError = null,
  queueLoaded = true,
  label = 'change',
}) {
  const pendingCount = queue?.length ?? 0;

  // Don't show banner until queue is loaded or there's actual pending state
  if (!queueLoaded || (pendingCount === 0 && !queueError)) {
    return null;
  }

  const labelPlural = pendingCount === 1 ? label : `${label}s`;
  const isError = Boolean(queueError);

  let message;
  if (isError) {
    message = `${pendingCount} ${labelPlural} failed to sync. ${queueError}`;
  } else if (syncing) {
    message = `Syncing ${pendingCount} pending ${labelPlural}…`;
  } else {
    message = `${pendingCount} ${labelPlural} queued for sync.`;
  }

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '6px',
        fontSize: '0.9rem',
        marginBottom: '1rem',
        border: '1px solid',
        background: isError ? '#fff4e5' : '#e8f1ff',
        color: isError ? '#8a4b00' : '#0b4ea2',
        borderColor: isError ? '#ffd7a8' : '#bfd5ff',
      }}
    >
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  );
}
