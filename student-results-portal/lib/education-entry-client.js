'use client';

const SESSION_ID_KEY = 'dropare-education-entry-session-id';
const SENT_KEY = 'dropare-education-entry-notification-sent';

function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export function resetEducationEntryNotification() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_ID_KEY);
  window.sessionStorage.removeItem(SENT_KEY);
}

export async function notifyEducationEntry() {
  if (typeof window === 'undefined') return { ok: false, skipped: true };
  if (window.sessionStorage.getItem(SENT_KEY)) return { ok: true, duplicate: true };

  let sessionId = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = createSessionId();
    window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  // Set this before the request so simultaneous layout mounts cannot send twice.
  window.sessionStorage.setItem(SENT_KEY, 'pending');

  try {
    const response = await fetch('/api/education/entry-notification', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'Entry notification failed.');
    window.sessionStorage.setItem(SENT_KEY, 'sent');
    return payload;
  } catch (error) {
    // Permit a later retry if the network or email provider was temporarily unavailable.
    window.sessionStorage.removeItem(SENT_KEY);
    console.warn('Education entry notification was not delivered:', error?.message || error);
    return { ok: false, error: error?.message || 'Entry notification failed.' };
  }
}
