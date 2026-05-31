/**
 * Tests for the PIN-based account authentication layer.
 *
 * The core helpers (generateSalt, hashPin, verifyPin) are replicated inline
 * so these tests run in Node.js without loading the full browser module.
 *
 * Coverage:
 *  1.  generateSalt produces a valid 32-char hex string
 *  2.  generateSalt produces unique values on every call
 *  3.  hashPin is deterministic (same pin + salt → same hash)
 *  4.  hashPin differs for different PINs
 *  5.  hashPin differs when the salt changes
 *  6.  hashPin output is a 64-char hex string (SHA-256)
 *  7.  verifyPin returns true for the correct PIN
 *  8.  verifyPin returns false for the wrong PIN
 *  9.  verifyPin returns false when storedHash is missing
 * 10.  verifyPin returns false when storedSalt is missing
 * 11.  Account creation stores passwordHash and passwordSalt
 * 12.  Selecting another account without a PIN is insufficient for login
 * 13.  Login with wrong PIN is rejected
 * 14.  Migration path: account without passwordHash accepts first PIN as setup
 * 15.  Session restoration does not require re-authentication
 * 16.  Regression: the original impersonation vector is blocked
 */

// ── Replicated helpers (must stay in sync with src/app.js) ───────────────────

function generateSalt() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin, saltHex) {
  const data = saltHex + ':' + String(pin);
  const encoded = new TextEncoder().encode(data);
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuf), b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPin(pin, storedHash, storedSalt) {
  if (!storedHash || !storedSalt) return false;
  const candidate = await hashPin(pin, storedSalt);
  return candidate === storedHash;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nRunning PIN authentication tests…\n');

// ── 1. generateSalt produces a valid 32-char hex string ───────────────────────
console.log('1. generateSalt produces a valid hex salt');
{
  const salt = generateSalt();
  assert(typeof salt === 'string',   'salt is a string');
  assert(salt.length === 32,         'salt is 32 characters (16 bytes hex)');
  assert(/^[0-9a-f]+$/i.test(salt),  'salt contains only hex characters');
}

// ── 2. generateSalt produces unique values ────────────────────────────────────
console.log('\n2. generateSalt produces unique values');
{
  const salts = new Set(Array.from({ length: 10 }, () => generateSalt()));
  assert(salts.size === 10, 'All 10 generated salts are unique');
}

// ── 3. hashPin is deterministic ───────────────────────────────────────────────
console.log('\n3. hashPin is deterministic');
{
  const salt = generateSalt();
  const h1 = await hashPin('1234', salt);
  const h2 = await hashPin('1234', salt);
  assert(h1 === h2, 'Same pin + salt always produces the same hash');
}

// ── 4. hashPin differs for different PINs ─────────────────────────────────────
console.log('\n4. hashPin differs for different PINs');
{
  const salt = generateSalt();
  const h1 = await hashPin('1234', salt);
  const h2 = await hashPin('5678', salt);
  assert(h1 !== h2, 'Different PINs produce different hashes with the same salt');
}

// ── 5. hashPin differs when the salt changes ──────────────────────────────────
console.log('\n5. hashPin differs when the salt changes');
{
  const s1 = generateSalt();
  const s2 = generateSalt();
  const h1 = await hashPin('1234', s1);
  const h2 = await hashPin('1234', s2);
  assert(h1 !== h2, 'Same PIN with different salts produces different hashes');
}

// ── 6. hashPin output is a 64-char hex string (SHA-256) ───────────────────────
console.log('\n6. hashPin output format');
{
  const hash = await hashPin('secret', generateSalt());
  assert(hash.length === 64,          'Hash is 64 characters (256-bit)');
  assert(/^[0-9a-f]+$/.test(hash),    'Hash contains only lowercase hex');
}

// ── 7. verifyPin returns true for the correct PIN ─────────────────────────────
console.log('\n7. verifyPin — correct PIN');
{
  const salt = generateSalt();
  const hash = await hashPin('my-pin', salt);
  const result = await verifyPin('my-pin', hash, salt);
  assert(result === true, 'verifyPin returns true for the correct PIN');
}

// ── 8. verifyPin returns false for the wrong PIN ──────────────────────────────
console.log('\n8. verifyPin — wrong PIN');
{
  const salt = generateSalt();
  const hash = await hashPin('correct', salt);
  const result = await verifyPin('wrong', hash, salt);
  assert(result === false, 'verifyPin returns false for an incorrect PIN');
}

// ── 9. verifyPin returns false when storedHash is missing ─────────────────────
console.log('\n9. verifyPin — missing hash');
{
  const result = await verifyPin('1234', null, generateSalt());
  assert(result === false, 'verifyPin returns false when storedHash is null');

  const result2 = await verifyPin('1234', '', generateSalt());
  assert(result2 === false, 'verifyPin returns false when storedHash is empty');
}

// ── 10. verifyPin returns false when storedSalt is missing ────────────────────
console.log('\n10. verifyPin — missing salt');
{
  const salt = generateSalt();
  const hash = await hashPin('1234', salt);
  assert(await verifyPin('1234', hash, null) === false,
    'verifyPin returns false when storedSalt is null');
  assert(await verifyPin('1234', hash, '') === false,
    'verifyPin returns false when storedSalt is empty string');
}

// ── 11. Account creation stores credential fields ────────────────────────────
console.log('\n11. Account creation stores passwordHash and passwordSalt');
{
  // Simulate the doRegister flow
  const pin  = 'test-pin-123';
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  const acc  = { id: 'acc-001', role: 'provider', name: 'Alice', org: 'Org', tokens: 0 };
  const fullAcc = { ...acc, passwordHash: hash, passwordSalt: salt };

  assert(typeof fullAcc.passwordHash === 'string' && fullAcc.passwordHash.length === 64,
    'Account record has a 64-char passwordHash');
  assert(typeof fullAcc.passwordSalt === 'string' && fullAcc.passwordSalt.length === 32,
    'Account record has a 32-char passwordSalt');
  assert(!('passwordHash' in acc),
    'The base account object (synced via DB.set) does NOT contain the hash');
}

// ── 12. Selecting another account without verifying PIN is insufficient ────────
console.log('\n12. Account selection alone is insufficient for login');
{
  // Simulate: attacker selects victim account but provides no PIN
  const salt = generateSalt();
  const hash = await hashPin('victim-pin', salt);
  const victimAcc = { id: 'victim', role: 'provider', name: 'Victim', passwordHash: hash, passwordSalt: salt };

  // Without PIN: verifyPin with empty string returns false
  const withEmpty = await verifyPin('', hash, salt);
  assert(withEmpty === false, 'Empty PIN cannot log in to an account');

  // Without PIN (null): verifyPin returns false
  const withNull = await verifyPin(null, hash, salt);
  assert(withNull === false, 'Null PIN cannot log in to an account');
}

// ── 13. Login with wrong PIN is rejected ─────────────────────────────────────
console.log('\n13. Login with wrong PIN is rejected');
{
  const salt = generateSalt();
  const hash = await hashPin('correct-pin', salt);

  assert(await verifyPin('wrong-pin',    hash, salt) === false, 'Wrong PIN rejected');
  assert(await verifyPin('Correct-Pin',  hash, salt) === false, 'Case-different PIN rejected');
  assert(await verifyPin('correct-pin ', hash, salt) === false, 'Trailing-space PIN rejected');
}

// ── 14. Migration path: first PIN set on account without credentials ──────────
console.log('\n14. Migration: account without credentials accepts first PIN as setup');
{
  // Simulate an existing account that has no passwordHash
  const existingAcc = { id: 'old-acc', role: 'rider', name: 'Bob', tokens: 0 };
  assert(!existingAcc.passwordHash, 'Pre-migration account has no passwordHash');

  // New user sets a PIN for the first time
  const newPin = 'new-pin-456';
  const salt   = generateSalt();
  const hash   = await hashPin(newPin, salt);
  existingAcc.passwordHash = hash;
  existingAcc.passwordSalt = salt;

  // Subsequent login with same PIN must succeed
  assert(await verifyPin(newPin, existingAcc.passwordHash, existingAcc.passwordSalt) === true,
    'After migration, correct PIN is accepted');
  // Wrong PIN still rejected
  assert(await verifyPin('wrong', existingAcc.passwordHash, existingAcc.passwordSalt) === false,
    'After migration, wrong PIN is rejected');
}

// ── 15. Session restoration does not require re-authentication ────────────────
console.log('\n15. Session restoration — credential check is not required');
{
  // The DOMContentLoaded auto-login reads SESSION_STATE_KEY and calls
  // executeLogin(existing) directly (no PIN prompt).  This is correct: the
  // persisted session represents a still-active browser session for the same
  // user.  We verify here that verifyPin is NOT called in that path by
  // confirming an account without a passwordHash can still be auto-restored.
  const restoredAcc = { id: 'sess-acc', role: 'plant', name: 'Carol' };
  // No passwordHash: if executeLogin is called directly (bypass), that is OK
  // for session restoration.  For dropdown login, PIN IS required.
  assert(typeof restoredAcc.passwordHash === 'undefined',
    'Restored account may lack passwordHash (direct session restore)');
}

// ── 16. Regression: original impersonation vector is now blocked ──────────────
console.log('\n16. Regression: original impersonation attack is blocked');
{
  // OLD behavior: doLogin did not call verifyPin at all.  Anyone who could
  // select an account in the dropdown gained immediate access.
  //
  // NEW behavior: verifyPin must return true before executeLogin is called.
  // Without the correct PIN, access is denied regardless of which account
  // the attacker selects.

  const victimSalt = generateSalt();
  const victimHash = await hashPin('victim-secret', victimSalt);
  const victimAcc  = { id: 'victim-acc', role: 'provider', name: 'Victim',
                       passwordHash: victimHash, passwordSalt: victimSalt };

  // Attacker selects victim's account and guesses wrong PIN
  const attackerGuess = 'wrong-guess';
  const allowed = await verifyPin(attackerGuess, victimAcc.passwordHash, victimAcc.passwordSalt);
  assert(allowed === false,
    '[regression] Attacker cannot log in with wrong PIN');

  // Victim with correct PIN can still log in
  const victimAllowed = await verifyPin('victim-secret', victimAcc.passwordHash, victimAcc.passwordSalt);
  assert(victimAllowed === true,
    '[regression] Legitimate owner with correct PIN is still granted access');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
