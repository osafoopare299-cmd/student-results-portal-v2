const JITSI_DOMAIN = 'meet.jit.si';

export function jitsiConfigured() {
  return true;
}

export function jitsiRoomUrl(roomName) {
  const room = encodeURIComponent(String(roomName || '').replace(/[^a-zA-Z0-9-]/g, ''));
  return `https://${JITSI_DOMAIN}/${room}#config.prejoinPageEnabled=true&config.disableDeepLinking=true&config.disableInviteFunctions=true&config.localRecording.disable=true`;
}
