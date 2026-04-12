// components/OfflineQueueBanner.js — persistent offline/syncing state indicator for all pages

/**
 * Props:
 *   pendingCount  number   — total items awaiting sync
 *   syncing       boolean  — currently uploading
 *   queueError    string|null — last sync failure message
 *   queueLoaded   boolean  — queue hydrated from storage (don't flash before load)
 *   label         string   — singular noun for the item type, e.g. "change" or "session"
 */
export default function OfflineQueueBanner({
  pendingCount = 0,
  syncing = false,
  queueError = null,
  queueLoaded = true,
  label = 'change',
}) {
  if (!queueLoaded || (pendingCount === 0 && !queueError)) return null;

  const noun = pendingCount === 1 ? label : `${label}s`;
  const isError = Boolean(queueError);

  let message;
  if (isError) {
    message = `${pendingCount} ${noun} failed to sync. ${queueError}`;
  } else if (syncing) {
    message = `Syncing ${pendingCount} pending ${noun}…`;
  } else {
    message = `${pendingCount} ${noun} saved locally — will sync when online.`;
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
