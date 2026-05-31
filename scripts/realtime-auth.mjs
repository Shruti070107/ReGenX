/**
 * @fileoverview Server-authoritative room assignment for the ReGenX realtime server.
 *
 * All room-membership decisions are made here, based solely on information
 * derived by the server from the claimed session.  Client-supplied room lists
 * are intentionally ignored — the caller must never pass them to these
 * functions.
 *
 * The `admin_room` is a server-only broadcast room.  No client role may join
 * it through a `session:join` request.  Legitimate application clients never
 * request it (see joinCurrentSession in src/realtime-sync.js).
 */

/**
 * Roles that client sessions are permitted to claim.
 * The string 'admin' is intentionally absent — it is a server-side-only
 * broadcast destination and must never be granted based on client input.
 */
export const VALID_ROLES = new Set(['provider', 'rider', 'plant']);

/**
 * Rooms that must never be joinable via client-supplied session:join data.
 * Membership in these rooms is reserved for server-side operations only.
 */
export const PROTECTED_ROOMS = new Set(['admin_room']);

/**
 * Returns the ordered list of rooms a socket is authorised to join based on
 * its claimed session identity.  The derivation is purely server-side:
 *
 *  - network_room        — every connected socket
 *  - {role}s_room        — role-specific broadcast (e.g. providers_room)
 *  - {role}_room         — role alias kept for backward compatibility
 *  - session:{sessionId} — private per-user channel (own ID only)
 *
 * If the claimed role is not in VALID_ROLES it is silently discarded and the
 * socket receives only network_room access.  This prevents any attempt to
 * escalate to 'admin' or any other unknown role.
 *
 * @param {unknown} role      - Role value supplied by the client.
 * @param {unknown} sessionId - Session ID supplied by the client.
 * @returns {string[]} Ordered list of authorised room names.
 */
export function getAuthorizedRooms(role, sessionId) {
  const rooms = ['network_room'];

  if (VALID_ROLES.has(role)) {
    rooms.push(`${role}s_room`); // e.g. providers_room
    rooms.push(`${role}_room`);  // e.g. provider_room (kept for compat)
  }

  // The socket may only join its OWN private session room.
  // Any attempt to specify another user's ID has no effect because the
  // server derives this value from what the socket itself reported; the
  // surrounding session:join handler is responsible for enforcing that
  // a socket cannot impersonate a different socket's identity.
  if (sessionId && typeof sessionId === 'string' && sessionId.trim()) {
    rooms.push(`session:${sessionId.trim()}`);
  }

  return rooms;
}
