// components/MessagesThreadList.js — message thread rendering for active and archived rows
import styles from './MessagesModal.module.css';

const ONE_HOUR_MS = 60 * 60 * 1000;

function formatMsgDateTime(isoString, prefix = 'sent:') {
  const date = new Date(isoString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[date.getDay()];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  let tz = '';
  try {
    const tzParts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(date);
    const tzPart = tzParts.find((part) => part.type === 'timeZoneName');
    if (tzPart) tz = tzPart.value;
  } catch {
    tz = 'local';
  }
  return `${prefix} ${dayName} ${month}/${day}/${year} ${hours}:${minutes} ${ampm} ${tz}`;
}

function getSenderLabel({ isSent, viewerName, otherName, otherIsTherapist }) {
  const viewer = viewerName || 'You';
  const other = otherIsTherapist ? `${otherName || 'PT'} (PT)` : otherName || 'PT';
  return isSent ? `${viewer} > ${other}` : `${other} > ${viewer}`;
}

function getRolledUpPreview(body, maxLength) {
  return body.length > maxLength ? `${body.slice(0, maxLength)}…` : body;
}

export default function MessagesThreadList({
  messages,
  viewerId,
  viewerName,
  otherName,
  otherIsTherapist,
  collapsedIds,
  showArchived,
  onToggleCollapse,
  onUndoSend,
  onArchive,
  onUnarchive,
  onMarkRead,
}) {
  const archivedMessages = messages.filter((message) => message.is_archived);
  const activeMessages = messages.filter((message) => !message.is_archived);

  return (
    <>
      {activeMessages.length === 0 && !showArchived && (
        <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
          No messages yet. Send a message to your PT!
        </p>
      )}

      {activeMessages.map((message) => {
        const isSent = message.sender_id === viewerId;
        const canUndoSend =
          isSent && Date.now() - new Date(message.created_at).getTime() < ONE_HOUR_MS;
        const isCollapsed = collapsedIds.has(message.id);
        const senderLabel = getSenderLabel({
          isSent,
          viewerName,
          otherName,
          otherIsTherapist,
        });

        if (isCollapsed) {
          return (
            <div
              key={message.id}
              className={`${styles['rolled-up']} ${isSent ? styles['rolled-up-sent'] : styles['rolled-up-received']}`}
              onPointerUp={() => onToggleCollapse(message.id)}
            >
              <span className={styles['rolled-up-label']}>{senderLabel}</span>
              <span className={styles['rolled-up-preview']}>
                {getRolledUpPreview(message.body, 50)}
              </span>
            </div>
          );
        }

        return (
          <div key={message.id}>
            <div
              className={`${styles['message-bubble']} ${isSent ? styles.sent : styles.received}`}
              onPointerUp={() => onToggleCollapse(message.id)}
            >
              <div className={styles['sender-label']}>{senderLabel}</div>
              {message.body}
              <div className={styles['message-meta']}>
                <span>{formatMsgDateTime(message.created_at, 'sent:')}</span>
                {isSent &&
                  (message.read_at ? (
                    <span className={styles['read-receipt']}>
                      {formatMsgDateTime(message.read_at, 'read at:')}
                    </span>
                  ) : (
                    <span className={styles.delivered}>Delivered</span>
                  ))}
              </div>
              <div
                className={styles['message-actions']}
                onPointerUp={(event) => event.stopPropagation()}
              >
                {!isSent && !message.read_by_recipient && (
                  <button
                    type="button"
                    className={styles['action-btn']}
                    onPointerUp={() => onMarkRead(message.id)}
                  >
                    Mark read
                  </button>
                )}
                {canUndoSend && (
                  <button
                    type="button"
                    className={styles['action-btn']}
                    onPointerUp={() => onUndoSend(message)}
                  >
                    Undo Send
                  </button>
                )}
                <button
                  type="button"
                  className={styles['action-btn']}
                  onPointerUp={() => onArchive(message.id)}
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {showArchived &&
        archivedMessages.map((message) => {
          const isSent = message.sender_id === viewerId;
          const senderLabel = getSenderLabel({
            isSent,
            viewerName,
            otherName,
            otherIsTherapist,
          });

          return (
            <div
              key={message.id}
              className={`${styles['rolled-up']} ${isSent ? styles['rolled-up-sent'] : styles['rolled-up-received']}`}
            >
              <span className={styles['rolled-up-label']}>{senderLabel}</span>
              <span className={styles['rolled-up-preview']}>
                {getRolledUpPreview(message.body, 60)}
              </span>
              <button
                type="button"
                className={styles['action-btn']}
                onPointerUp={() => onUnarchive(message.id)}
              >
                Restore
              </button>
            </div>
          );
        })}
    </>
  );
}
