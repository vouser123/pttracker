// lib/messages.js — shared message read, send, patch, delete, and badge-count helpers
import { buildAuthHeaders, fetchJsonWithOffline } from './fetch-with-offline';

export async function fetchMessages(token) {
  const data = await fetchJsonWithOffline('/api/messages', {
    token,
    errorPrefix: 'fetchMessages failed',
    offlineMessage: 'Offline - messages unavailable.',
  });
  return data.messages ?? [];
}

export async function sendMessage(token, recipientId, body) {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: buildAuthHeaders(token),
    body: JSON.stringify({ recipient_id: recipientId, body }),
  });
  if (!res.ok) throw new Error(`sendMessage failed: ${res.status}`);
  return res.json();
}

export async function patchMessage(token, messageId, patch) {
  const res = await fetch(`/api/messages?id=${messageId}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(token),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`patchMessage failed: ${res.status}`);
  return res.json();
}

export async function deleteMessage(token, messageId) {
  const res = await fetch(`/api/messages?id=${messageId}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(token),
  });
  if (!res.ok) throw new Error(`deleteMessage failed: ${res.status}`);
}

export function countUnreadMessages(messages, viewerId) {
  if (!viewerId) return 0;
  return (messages ?? []).filter(
    (message) =>
      message.sender_id !== viewerId && !message.read_by_recipient && !message.is_archived,
  ).length;
}

export function countRecentSent(messages, viewerId, lastSentTime) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since = new Date(lastSentTime ?? 0);
  return (messages ?? []).filter(
    (message) =>
      message.sender_id === viewerId &&
      new Date(message.created_at) > oneDayAgo &&
      new Date(message.created_at) > since,
  ).length;
}
