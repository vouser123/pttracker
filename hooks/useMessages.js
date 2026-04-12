// hooks/useMessages.js — owns realtime message refresh, badge state, and message actions
/**
 * useMessages — fetch, subscribe, send, and archive messages.
 *
 * Uses Supabase Realtime to subscribe to clinical_messages changes instead of
 * polling. A one-time fetch on mount (delayed 3s to avoid competing with tracker
 * bootstrap) hydrates initial state. The Realtime channel triggers a refresh
 * whenever a row is inserted, updated, or deleted for the current user.
 *
 * The page passes in the viewer's profile id (users table PK) for badge count calculations.
 * NOTE: clinical_messages.sender_id stores the users table PK, NOT the Supabase auth UUID.
 * Pass profileId (current.id from fetchUsers), not session.user.id (auth_id).
 *
 * @param {string|null} token  Supabase access token (null when signed out)
 * @param {string|null} viewerId  Current user's profile id (users table PK, not auth_id)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  countUnreadMessages,
  deleteMessage,
  fetchMessages,
  patchMessage,
  sendMessage,
} from '../lib/messages';
import { supabase } from '../lib/supabase';

const MOUNT_DELAY_MS = 3_000;

export function useMessages(token, viewerId) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef(null);
  const mountTimerRef = useRef(null);

  /** Load messages and recompute badge count using DB read_by_recipient field. */
  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const msgs = await fetchMessages(token);
      setMessages(msgs);
      // Guard: viewerId arrives async from useUserContext; return 0 until resolved
      // to prevent a flash where all messages briefly appear unread.
      setUnreadCount(viewerId ? countUnreadMessages(msgs, viewerId) : 0);
    } catch (err) {
      console.error('useMessages refresh:', err);
    }
  }, [token, viewerId]);

  // Subscribe to Realtime changes on clinical_messages.
  // Fetch once on mount (delayed), then let the channel drive updates.
  useEffect(() => {
    if (!token) return;

    // Delayed initial fetch — avoids racing with tracker bootstrap on open.
    mountTimerRef.current = setTimeout(refresh, MOUNT_DELAY_MS);

    // Realtime channel: re-fetch on any INSERT/UPDATE/DELETE in clinical_messages.
    // Filter is server-side but clinical_messages RLS already scopes to the user,
    // so any change that reaches the client is relevant.
    channelRef.current = supabase
      .channel('clinical_messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinical_messages' }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      clearTimeout(mountTimerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [token, refresh]);

  /**
   * Call when the messages modal opens.
   * Clears the badge optimistically and PATCHes all unread received messages
   * as read on the server — matching static pt_view.html markReceivedMessagesAsRead().
   * Fire-and-forget: UI updates immediately; server patch runs in background.
   */
  function markModalOpened() {
    setUnreadCount(0);

    if (!token || !viewerId) return;

    // Find all unread received messages (not sent by viewer, not yet read)
    const unreadReceived = messages.filter(
      (m) => m.sender_id !== viewerId && !m.read_by_recipient && !m.is_archived,
    );
    if (unreadReceived.length === 0) return;

    // PATCH each one as read then refresh once
    Promise.all(unreadReceived.map((m) => patchMessage(token, m.id, { read: true })))
      .then(() => refresh())
      .catch((err) => console.error('markModalOpened patch read:', err));
  }

  /** Send a new message to recipientId. */
  async function send(recipientId, body) {
    await sendMessage(token, recipientId, body);
    await refresh();
  }

  /** Archive a message (rolls it up visually). */
  async function archive(messageId) {
    await patchMessage(token, messageId, { archived: true });
    await refresh();
  }

  /** Unarchive a message (restores from rolled-up state). */
  async function unarchive(messageId) {
    await patchMessage(token, messageId, { archived: false });
    await refresh();
  }

  /** Mark a message read. */
  async function markRead(messageId) {
    await patchMessage(token, messageId, { read: true });
    await refresh();
  }

  /** Permanently delete a message (undo-send, within 1-hour window). */
  async function remove(messageId) {
    await deleteMessage(token, messageId);
    await refresh();
  }

  return {
    messages,
    unreadCount,
    refresh,
    markModalOpened,
    send,
    archive,
    unarchive,
    markRead,
    remove,
  };
}
