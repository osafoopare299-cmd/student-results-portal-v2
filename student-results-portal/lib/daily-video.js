const DAILY_API = 'https://api.daily.co/v1';

function config() {
  const apiKey = process.env.DAILY_API_KEY;
  const domain = String(process.env.DAILY_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!apiKey || !domain) throw new Error('Daily is not configured for this environment.');
  return { apiKey, domain };
}

async function dailyRequest(path, options = {}) {
  const { apiKey } = config();
  const response = await fetch(`${DAILY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.info || payload?.error || `Daily request failed (${response.status}).`);
  return payload;
}

export function dailyConfigured() {
  return Boolean(process.env.DAILY_API_KEY && process.env.DAILY_DOMAIN);
}

export async function createDailyRoom({ name, startsAt, endsAt }) {
  const start = Math.floor(new Date(startsAt).getTime() / 1000);
  const end = Math.floor(new Date(endsAt).getTime() / 1000);
  return dailyRequest('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      name,
      privacy: 'private',
      properties: {
        nbf: Math.max(0, start - 1800),
        exp: end + 1800,
        eject_at_room_exp: true,
        enable_chat: true,
        enable_screenshare: true,
        enable_prejoin_ui: true,
        enable_people_ui: true,
        enable_emoji_reactions: true,
      },
    }),
  });
}

export async function createDailyToken({ roomName, user, owner = false, expiresAt }) {
  const exp = Math.floor(new Date(expiresAt).getTime() / 1000) + 1800;
  const data = await dailyRequest('/meeting-tokens', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: user.full_name,
        user_id: String(user.id),
        is_owner: owner,
        exp,
        enable_recording: false,
      },
    }),
  });
  return data.token;
}

export function dailyRoomUrl(roomName) {
  const { domain } = config();
  return `https://${domain}/${roomName}`;
}
