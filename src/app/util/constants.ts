// A client is considered online when its last WireGuard handshake is within
// this many seconds (3 minutes).
export const WG_HANDSHAKE_INTERVAL_SECONDS = 180;

// How often the instance page polls the backend for client status (30 seconds).
export const CLIENT_STATUS_POLL_INTERVAL_MS = 30 * 1000;
