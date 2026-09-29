export function normalizeZoomMeetingUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    const hostname = url.hostname.toLowerCase();
    const zoomHost = hostname === 'zoom.us' || hostname.endsWith('.zoom.us');
    if (url.protocol !== 'https:' || !zoomHost || url.username || url.password || url.pathname === '/') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}
