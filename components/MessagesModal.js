// components/MessagesModal.js — message modal shell for compose, open-state, and modal effects
import { useEffect, useRef, useState } from 'react';
import styles from './MessagesModal.module.css';
import MessagesThreadList from './MessagesThreadList';

export default function MessagesModal({
  isOpen,
  onClose,
  messages,
  viewerId,
  viewerName,
  otherName,
  otherIsTherapist,
  recipientId,
  emailEnabled,
  onSend,
  onArchive,
  onUnarchive,
  onRemove,
  onMarkRead,
  onEmailToggle,
  onOpened,
}) {
  const messageCount = messages.length;
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // Local collapse state for non-archived messages (tap body to roll up/expand)
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  // Show archived messages at bottom of list
  const [showArchived, setShowArchived] = useState(false);
  const listRef = useRef(null);

  // Notify parent that modal opened (clears unread count)
  useEffect(() => {
    if (isOpen && onOpened) onOpened();
  }, [isOpen, onOpened]);

  // Scroll to bottom when messages change or modal opens
  useEffect(() => {
    if (isOpen && messageCount >= 0 && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [isOpen, messageCount]);

  // Reset local state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCollapsedIds(new Set());
      setShowArchived(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function resolveReplyRecipientId() {
    const participant = messages.find(
      (msg) => msg.sender_id !== viewerId || msg.recipient_id !== viewerId,
    );
    if (!participant) return recipientId;
    return participant.sender_id === viewerId ? participant.recipient_id : participant.sender_id;
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    const targetId = resolveReplyRecipientId();
    if (!targetId || targetId === viewerId) return;
    setSending(true);
    try {
      await onSend(targetId, body);
      setDraft('');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /** Toggle local collapse for a non-archived message (tap body to roll up/expand). */
  function toggleCollapse(messageId) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  async function handleUndoSend(msg) {
    if (!window.confirm('Delete this message? It will be removed for both you and the recipient.'))
      return;
    await onRemove(msg.id);
  }

  const archivedCount = messages.filter((m) => m.is_archived).length;

  return (
    <div
      className={styles.overlay}
      onPointerUp={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Messages</h2>
          <button
            type="button"
            className={styles['close-btn']}
            onPointerUp={onClose}
            aria-label="Close messages"
          >
            ✕
          </button>
        </div>

        {/* Message list */}
        <div className={styles['message-list']} ref={listRef}>
          <MessagesThreadList
            messages={messages}
            viewerId={viewerId}
            viewerName={viewerName}
            otherName={otherName}
            otherIsTherapist={otherIsTherapist}
            collapsedIds={collapsedIds}
            showArchived={showArchived}
            onToggleCollapse={toggleCollapse}
            onUndoSend={handleUndoSend}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onMarkRead={onMarkRead}
          />
        </div>

        {/* Email notification toggle */}
        <div className={styles['email-toggle']}>
          <input
            type="checkbox"
            id="email-notify"
            checked={emailEnabled}
            onChange={(e) => onEmailToggle(e.target.checked)}
          />
          <label htmlFor="email-notify">Email me when I receive a message</label>
        </div>

        {/* Show archived toggle — only visible when there are archived messages */}
        {archivedCount > 0 && (
          <div className={styles['email-toggle']}>
            <input
              type="checkbox"
              id="show-archived"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <label htmlFor="show-archived">
              Show {archivedCount} archived message{archivedCount !== 1 ? 's' : ''}
            </label>
          </div>
        )}

        {/* Compose */}
        <div className={styles.compose}>
          <textarea
            className={styles['compose-input']}
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            type="button"
            className={styles['send-btn']}
            onPointerUp={handleSend}
            disabled={!draft.trim() || sending}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
