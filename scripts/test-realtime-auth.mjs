/**
 * Tests for the server-authoritative room assignment logic in realtime-auth.mjs.
 *
 * These are pure unit tests: they exercise getAuthorizedRooms and the
 * associated constants without starting a server or opening any sockets.
 * This makes them fast, deterministic, and free of network dependencies.
 *
 * Coverage:
 *  1.  Authorised provider join
 *  2.  Authorised rider join
 *  3.  Authorised plant join
 *  4.  Role escalation attempt (admin) — must be blocked
 *  5.  Unknown/arbitrary role — must be rejected
 *  6.  No role supplied — network_room only
 *  7.  Valid session ID produces own private room
 *  8.  No session ID — no private room added
 *  9.  Private room of another user cannot be obtained
 * 10.  admin_room is never in any authorised room set
 * 11.  Whitespace-only session ID is rejected
 * 12.  Non-string session ID is rejected
 * 13.  Session restoration / reconnect: re-calling with same args is stable
 * 14.  Regression: the exact payload from the reported vulnerability
 *       produces only network_room (no admin_room, no victim session room)
 * 15.  VALID_ROLES and PROTECTED_ROOMS are exported correctly
 */

import { getAuthorizedRooms, VALID_ROLES, PROTECTED_ROOMS } from './realtime-auth.mjs';

// ── helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function includes(rooms, room) { return rooms.includes(room); }
function excludes(rooms, room) { return !rooms.includes(room); }

// ── tests ─────────────────────────────────────────────────────────────────────

console.log('\nRunning realtime authorisation tests…\n');

// ── 1. Authorised provider join ───────────────────────────────────────────────
console.log('1. Authorised provider join');
{
  const rooms = getAuthorizedRooms('provider', 'prov-001');
  assert(includes(rooms, 'network_room'),   'provider gets network_room');
  assert(includes(rooms, 'providers_room'), 'provider gets providers_room');
  assert(includes(rooms, 'provider_room'),  'provider gets provider_room (compat alias)');
  assert(includes(rooms, 'session:prov-001'), 'provider gets own session room');
  assert(excludes(rooms, 'admin_room'),     'provider does not get admin_room');
}

// ── 2. Authorised rider join ──────────────────────────────────────────────────
console.log('\n2. Authorised rider join');
{
  const rooms = getAuthorizedRooms('rider', 'rider-007');
  assert(includes(rooms, 'network_room'),    'rider gets network_room');
  assert(includes(rooms, 'riders_room'),     'rider gets riders_room');
  assert(includes(rooms, 'rider_room'),      'rider gets rider_room (compat alias)');
  assert(includes(rooms, 'session:rider-007'), 'rider gets own session room');
  assert(excludes(rooms, 'admin_room'),      'rider does not get admin_room');
  assert(excludes(rooms, 'providers_room'),  'rider does not get providers_room');
}

// ── 3. Authorised plant join ──────────────────────────────────────────────────
console.log('\n3. Authorised plant join');
{
  const rooms = getAuthorizedRooms('plant', 'plant-42');
  assert(includes(rooms, 'network_room'),   'plant gets network_room');
  assert(includes(rooms, 'plants_room'),    'plant gets plants_room');
  assert(includes(rooms, 'plant_room'),     'plant gets plant_room (compat alias)');
  assert(includes(rooms, 'session:plant-42'), 'plant gets own session room');
  assert(excludes(rooms, 'admin_room'),     'plant does not get admin_room');
}

// ── 4. Role escalation attempt — admin ───────────────────────────────────────
console.log('\n4. Role escalation attempt (admin role)');
{
  const rooms = getAuthorizedRooms('admin', 'attacker');
  assert(includes(rooms, 'network_room'),   'attacker still gets network_room');
  assert(excludes(rooms, 'admin_room'),     'admin_room is NOT granted');
  assert(excludes(rooms, 'admins_room'),    'admins_room is NOT granted');
  assert(excludes(rooms, 'admin_room'),     'no admin broadcast access via role claim');
  assert(rooms.length === 2,               'only network_room + session room granted (2 rooms)');
  // The session room is still granted (attacker's own ID is legitimate)
  assert(includes(rooms, 'session:attacker'), 'own session room is still granted');
}

// ── 5. Unknown / arbitrary role ───────────────────────────────────────────────
console.log('\n5. Unknown arbitrary role is rejected');
{
  const rooms = getAuthorizedRooms('superuser', 'uid-x');
  assert(includes(rooms, 'network_room'),  'unknown role still gets network_room');
  assert(excludes(rooms, 'superusers_room'), 'no room derived for unknown role');
  assert(rooms.filter(r => r !== 'network_room' && !r.startsWith('session:')).length === 0,
    'no extra rooms beyond network_room and session room');
}

// ── 6. No role supplied ───────────────────────────────────────────────────────
console.log('\n6. No role supplied — network_room only (plus session room)');
{
  const withNull = getAuthorizedRooms(null, 'uid-y');
  assert(includes(withNull, 'network_room'), 'null role → network_room');
  assert(withNull.filter(r => !r.startsWith('session:')).length === 1,
    'null role → no extra broadcast rooms');

  const withUndef = getAuthorizedRooms(undefined, 'uid-y');
  assert(includes(withUndef, 'network_room'), 'undefined role → network_room');
}

// ── 7. Valid session ID produces own private room ─────────────────────────────
console.log('\n7. Valid session ID produces own private session room');
{
  const rooms = getAuthorizedRooms('rider', 'abc123');
  assert(includes(rooms, 'session:abc123'), 'session:abc123 is in room list');
}

// ── 8. No session ID — no private room added ─────────────────────────────────
console.log('\n8. Missing session ID — no private room added');
{
  const withNull = getAuthorizedRooms('provider', null);
  assert(withNull.every(r => !r.startsWith('session:')), 'null sessionId → no session room');

  const withEmpty = getAuthorizedRooms('provider', '');
  assert(withEmpty.every(r => !r.startsWith('session:')), 'empty sessionId → no session room');
}

// ── 9. Private room of another user cannot be obtained ───────────────────────
console.log('\n9. Private room of another user cannot be obtained');
{
  const attackerRooms = getAuthorizedRooms('rider', 'attacker-id');
  const victimPrivateRoom = 'session:victim-id';
  assert(excludes(attackerRooms, victimPrivateRoom),
    'attacker does not receive victim\'s session room');
  assert(includes(attackerRooms, 'session:attacker-id'),
    'attacker receives only their own session room');
}

// ── 10. admin_room never appears in any authorised room set ───────────────────
console.log('\n10. admin_room is never in any authorised room set');
{
  const roles = ['provider', 'rider', 'plant', 'admin', 'superuser', null, undefined];
  for (const role of roles) {
    const rooms = getAuthorizedRooms(role, 'uid');
    assert(excludes(rooms, 'admin_room'), `admin_room absent for role="${role}"`);
  }
}

// ── 11. Whitespace-only session ID is rejected ────────────────────────────────
console.log('\n11. Whitespace-only session ID is rejected');
{
  const rooms = getAuthorizedRooms('provider', '   ');
  assert(rooms.every(r => !r.startsWith('session:')),
    'whitespace-only session ID produces no session room');
}

// ── 12. Non-string session ID is rejected ─────────────────────────────────────
console.log('\n12. Non-string session ID types are rejected');
{
  for (const bad of [42, true, {}, [], Symbol('x')]) {
    const rooms = getAuthorizedRooms('provider', bad);
    assert(rooms.every(r => !r.startsWith('session:')),
      `non-string sessionId (${typeof bad}) produces no session room`);
  }
}

// ── 13. Reconnect stability: calling twice with same args is idempotent ────────
console.log('\n13. Reconnect stability — repeated calls with same args are idempotent');
{
  const first  = getAuthorizedRooms('plant', 'plant-session-99');
  const second = getAuthorizedRooms('plant', 'plant-session-99');
  assert(
    JSON.stringify(first) === JSON.stringify(second),
    'Repeated calls with same args return identical room lists'
  );
}

// ── 14. Regression — original reported vulnerability payload ──────────────────
console.log('\n14. Regression: original vulnerability payload is fully neutralised');
{
  // Reproduces the attack:
  //   socket.emit('session:join', {
  //     session: { role: 'admin', id: 'attacker' },
  //     rooms: ['session:VICTIM_ID']
  //   });
  // The server now ignores the rooms array and derives membership from role/id only.
  // We test getAuthorizedRooms with the claimed role and id.
  const claimedRole = 'admin';
  const claimedId   = 'attacker';

  const rooms = getAuthorizedRooms(claimedRole, claimedId);

  assert(excludes(rooms, 'admin_room'),
    '[regression] admin_room not granted for admin role claim');
  assert(excludes(rooms, 'admins_room'),
    '[regression] admins_room not granted for admin role claim');
  assert(excludes(rooms, 'session:VICTIM_ID'),
    '[regression] victim session room not granted (rooms array ignored)');
  assert(includes(rooms, 'network_room'),
    '[regression] network_room still granted (legitimate access preserved)');

  // Even if an attacker also requests providers_room via the rooms array,
  // the server derives from role only — 'admin' is not in VALID_ROLES.
  assert(excludes(rooms, 'providers_room'),
    '[regression] providers_room not granted by admin role claim');
}

// ── 15. Exports are correctly shaped ─────────────────────────────────────────
console.log('\n15. Module exports are correctly shaped');
{
  assert(VALID_ROLES instanceof Set,              'VALID_ROLES is a Set');
  assert(VALID_ROLES.has('provider'),             'VALID_ROLES includes provider');
  assert(VALID_ROLES.has('rider'),                'VALID_ROLES includes rider');
  assert(VALID_ROLES.has('plant'),                'VALID_ROLES includes plant');
  assert(!VALID_ROLES.has('admin'),               'VALID_ROLES does NOT include admin');

  assert(PROTECTED_ROOMS instanceof Set,          'PROTECTED_ROOMS is a Set');
  assert(PROTECTED_ROOMS.has('admin_room'),       'PROTECTED_ROOMS includes admin_room');

  assert(typeof getAuthorizedRooms === 'function', 'getAuthorizedRooms is a function');
}

// ── summary ───────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
