/**
 * Tests for the operational:event write-authorization layer in
 * realtime-writes-auth.mjs.
 *
 * These are pure unit tests of isWriteAuthorized and the exported constants.
 * No server is started; the authorization logic is tested directly.
 *
 * Coverage:
 *  1.  Authorized own-account write
 *  2.  Unauthorized cross-user account write
 *  3.  Plant writing to provider account (token-reward flow) — must be allowed
 *  4.  Order writes from provider — authorized
 *  5.  Order writes from rider   — authorized
 *  6.  Order writes from plant   — authorized
 *  7.  IoT bins write from provider — authorized
 *  8.  IoT bins write from rider    — rejected (wrong role)
 *  9.  Shared aggregate key write from any valid role — authorized
 * 10.  Unknown namespace write — rejected
 * 11.  No session established — rejected
 * 12.  Admin role claim — rejected (not in VALID_ROLES)
 * 13.  Key without application prefix — rejected
 * 14.  Spend-log and smart-alerts keys — authorized
 * 15.  Regression: the exact attack payload from the issue is rejected
 */

import {
  isWriteAuthorized,
  VALID_ROLES,
  SHARED_WRITABLE_KEYS,
  STORAGE_PREFIX
} from './realtime-writes-auth.mjs';

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

function session(role, sessionId) {
  return { role, sessionId };
}

// ── test suite ────────────────────────────────────────────────────────────────

console.log('\nRunning realtime write-authorization tests…\n');

// ── 1. Authorized own-account write ──────────────────────────────────────────
console.log('1. Authorized own-account write');
{
  const s = session('provider', 'prov-001');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'acc:prov-001') === true,
    'Provider may write to its own account record');
}

// ── 2. Unauthorized cross-user account write ──────────────────────────────────
console.log('\n2. Unauthorized cross-user account write');
{
  const s = session('provider', 'prov-001');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'acc:prov-002') === false,
    'Provider cannot overwrite a different provider\'s account');
  const r = session('rider', 'rider-007');
  assert(isWriteAuthorized(r, STORAGE_PREFIX + 'acc:prov-001') === false,
    'Rider cannot write to a provider\'s account');
}

// ── 3. Plant writing to provider account (token-reward flow) ──────────────────
console.log('\n3. Plant writing to provider account — must be allowed');
{
  // When the plant operator confirms an order, the provider's account is updated
  // with the minted token balance.  This is a legitimate cross-account write.
  const s = session('plant', 'plant-alpha');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'acc:prov-001') === true,
    'Plant may write to any account record (token-reward flow)');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'acc:plant-alpha') === true,
    'Plant may also write to its own account');
}

// ── 4-6. Order writes from provider / rider / plant ──────────────────────────
console.log('\n4. Order writes from provider');
{
  const s = session('provider', 'prov-001');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'ord:abc123') === true,
    'Provider may write to order records');
}

console.log('\n5. Order writes from rider');
{
  const s = session('rider', 'rider-007');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'ord:abc123') === true,
    'Rider may write to order records');
}

console.log('\n6. Order writes from plant');
{
  const s = session('plant', 'plant-alpha');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'ord:abc123') === true,
    'Plant may write to order records');
}

// ── 7. IoT bins write from provider ──────────────────────────────────────────
console.log('\n7. IoT bins write from provider');
{
  const s = session('provider', 'prov-001');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'iot-bins') === true,
    'Provider may write IoT bin data');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'iot-bins-extra') === true,
    'Provider may write IoT bin data with suffix key');
}

// ── 8. IoT bins write from rider — rejected ───────────────────────────────────
console.log('\n8. IoT bins write from rider — rejected');
{
  const s = session('rider', 'rider-007');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'iot-bins') === false,
    'Rider may not write IoT bin data');
}

// ── 9. Shared aggregate keys — any valid role ─────────────────────────────────
console.log('\n9. Shared aggregate keys accessible to any valid role');
{
  const roles = ['provider', 'rider', 'plant'];
  for (const r of roles) {
    const s = session(r, 'any-id');
    for (const key of SHARED_WRITABLE_KEYS) {
      assert(isWriteAuthorized(s, key) === true,
        `${r} may write shared key: ${key}`);
    }
  }
}

// ── 10. Unknown namespace write — rejected ────────────────────────────────────
console.log('\n10. Unknown namespace write — rejected');
{
  const s = session('provider', 'prov-001');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'internal:secret') === false,
    'Unknown key namespace is denied');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'admin:config') === false,
    'Admin namespace key is denied');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'system:settings') === false,
    'System namespace key is denied');
}

// ── 11. No session established — rejected ─────────────────────────────────────
console.log('\n11. No session — all writes rejected');
{
  assert(isWriteAuthorized(null,      STORAGE_PREFIX + 'acc:prov-001') === false,
    'null session rejects account write');
  assert(isWriteAuthorized(undefined, STORAGE_PREFIX + 'ord:abc123') === false,
    'undefined session rejects order write');
  assert(isWriteAuthorized(null,      STORAGE_PREFIX + 'trust-ledger') === false,
    'null session rejects shared key write');
}

// ── 12. Admin role claim — rejected ──────────────────────────────────────────
console.log('\n12. Admin role claim — all writes rejected');
{
  const s = session('admin', 'attacker');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'acc:attacker') === false,
    'Admin role cannot write own account');
  assert(isWriteAuthorized(s, STORAGE_PREFIX + 'trust-ledger') === false,
    'Admin role cannot write shared keys');
}

// ── 13. Key without application prefix — rejected ────────────────────────────
console.log('\n13. Key without application prefix — rejected');
{
  const s = session('provider', 'prov-001');
  assert(isWriteAuthorized(s, 'acc:prov-001') === false,
    'Key without regenx-v3: prefix is rejected');
  assert(isWriteAuthorized(s, '') === false,
    'Empty key is rejected');
  assert(isWriteAuthorized(s, null) === false,
    'null key is rejected');
}

// ── 14. Spend-log and smart-alerts keys ──────────────────────────────────────
console.log('\n14. Per-account auxiliary keys accessible to any valid role');
{
  for (const role of ['provider', 'rider', 'plant']) {
    const s = session(role, 'some-id');
    assert(isWriteAuthorized(s, STORAGE_PREFIX + 'spend-log:prov-001') === true,
      `${role} may write spend-log`);
    assert(isWriteAuthorized(s, STORAGE_PREFIX + 'smart-alerts:some-id') === true,
      `${role} may write smart-alerts`);
  }
}

// ── 15. Regression — the exact attack described in the issue report ───────────
console.log('\n15. Regression: attack payload from the issue report is rejected');
{
  // Scenario: attacker connects and sends an operational:event without having
  // called session:join (no session registered).
  const noSession = null;
  const victimAccountKey = STORAGE_PREFIX + 'acc:VICTIM_ID';

  assert(isWriteAuthorized(noSession, victimAccountKey) === false,
    '[regression] Write with no session is rejected');

  // Scenario: attacker calls session:join with their own ID then tries to
  // overwrite a different account.
  const attackerSession = session('provider', 'attacker-id');
  assert(isWriteAuthorized(attackerSession, victimAccountKey) === false,
    '[regression] Cross-user account overwrite is rejected');

  // Scenario: attacker claims admin role.
  const adminSession = session('admin', 'attacker-id');
  assert(isWriteAuthorized(adminSession, STORAGE_PREFIX + 'trust-ledger') === false,
    '[regression] Admin role cannot write shared keys');
  assert(isWriteAuthorized(adminSession, victimAccountKey) === false,
    '[regression] Admin role cannot write any account key');

  // Verify legitimate provider can still write their own account
  const legitimateSession = session('provider', 'VICTIM_ID');
  assert(isWriteAuthorized(legitimateSession, victimAccountKey) === true,
    '[regression] Legitimate owner can still write their own account');
}

// ── Export assertions ─────────────────────────────────────────────────────────
console.log('\n16. Module exports are correctly shaped');
{
  assert(VALID_ROLES instanceof Set,    'VALID_ROLES is a Set');
  assert(VALID_ROLES.has('provider'),   'VALID_ROLES includes provider');
  assert(VALID_ROLES.has('rider'),      'VALID_ROLES includes rider');
  assert(VALID_ROLES.has('plant'),      'VALID_ROLES includes plant');
  assert(!VALID_ROLES.has('admin'),     'VALID_ROLES does NOT include admin');
  assert(SHARED_WRITABLE_KEYS instanceof Set, 'SHARED_WRITABLE_KEYS is a Set');
  assert(SHARED_WRITABLE_KEYS.size > 0, 'SHARED_WRITABLE_KEYS is non-empty');
  assert(typeof isWriteAuthorized === 'function', 'isWriteAuthorized is a function');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
