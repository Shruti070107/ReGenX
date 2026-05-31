/**
 * Tests for TrustProtocol.generateLedgerHash and TrustProtocol.verifyLedgerIntegrity.
 *
 * Coverage:
 *  1.  verifyLedgerIntegrity is exported and callable
 *  2.  generateLedgerHash is exported and callable
 *  3.  Hash generation is deterministic (identical inputs → identical hash)
 *  4.  Hash changes when content changes
 *  5.  Valid ledger passes integrity verification
 *  6.  Tampered hash is detected (chain break at the modified entry)
 *  7.  Broken previousHash link is detected
 *  8.  Empty ledger is accepted as valid
 *  9.  Trust event recording: entry built with generateLedgerHash verifies correctly
 * 10.  Regression: methods no longer throw TypeError; the old code path is exercised
 *      without crashing
 *
 * Additional:
 * 11.  First entry without GENESIS previousHash is rejected
 * 12.  Entry with missing hash field is rejected
 * 13.  All existing TrustProtocol methods remain intact after the addition
 */

import { TrustProtocol } from '../src/trust.js';

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

/**
 * Builds a minimal sealed ledger entry using TrustProtocol.generateLedgerHash,
 * mirroring what prepareTrustLedgerEntry does in app.js.
 */
async function makeEntry(fields, previousHash) {
  const hash = await TrustProtocol.generateLedgerHash(fields, previousHash);
  return {
    _v: 2,
    id: 'test-' + Math.random().toString(36).slice(2),
    orderId:   fields.orderId   || 'ord-001',
    event:     fields.event     || 'requested',
    ts:        fields.ts        || 1_700_000_000_000,
    lat:       fields.lat       ?? null,
    lng:       fields.lng       ?? null,
    actorRole: fields.actorRole || 'provider',
    actorId:   fields.actorId   || 'user-001',
    trustScore: 0,
    previousHash,
    hash,
    sealed: true,
    verified: true
  };
}

/** Builds an N-entry ledger where each entry links to its predecessor. */
async function buildLedger(entries) {
  const ledger = [];
  let prev = 'GENESIS';
  for (const fields of entries) {
    const entry = await makeEntry(fields, prev);
    ledger.push(entry);
    prev = entry.hash;
  }
  return ledger;
}

// ── test suite ────────────────────────────────────────────────────────────────

console.log('\nRunning trust ledger tests…\n');

// ── 1. verifyLedgerIntegrity exists ──────────────────────────────────────────
console.log('1. verifyLedgerIntegrity is exported');
assert(typeof TrustProtocol.verifyLedgerIntegrity === 'function',
  'TrustProtocol.verifyLedgerIntegrity is a function');

// ── 2. generateLedgerHash exists ─────────────────────────────────────────────
console.log('\n2. generateLedgerHash is exported');
assert(typeof TrustProtocol.generateLedgerHash === 'function',
  'TrustProtocol.generateLedgerHash is a function');

// ── 3. Hash generation is deterministic ──────────────────────────────────────
console.log('\n3. Hash generation is deterministic');
{
  const fields = { orderId: 'ord-1', event: 'requested', ts: 1_700_000_000, actorRole: 'provider', actorId: 'u1' };
  const h1 = await TrustProtocol.generateLedgerHash(fields, 'GENESIS');
  const h2 = await TrustProtocol.generateLedgerHash(fields, 'GENESIS');
  assert(h1 === h2, 'Same inputs produce the same hash');
  assert(h1.startsWith('0x'), 'Hash has 0x prefix');
  assert(h1.length === 66, 'Hash is 66 characters (0x + 64 hex digits)');
}

// ── 4. Hash changes when content changes ─────────────────────────────────────
console.log('\n4. Hash changes when content changes');
{
  const base = { orderId: 'ord-1', event: 'requested', ts: 1_700_000_000, actorRole: 'provider', actorId: 'u1' };
  const hBase    = await TrustProtocol.generateLedgerHash(base, 'GENESIS');
  const hDiffEvt = await TrustProtocol.generateLedgerHash({ ...base, event: 'assigned' }, 'GENESIS');
  const hDiffPrev= await TrustProtocol.generateLedgerHash(base, '0xdeadbeef');
  assert(hBase !== hDiffEvt,  'Different event field produces different hash');
  assert(hBase !== hDiffPrev, 'Different previousHash produces different hash');
}

// ── 5. Key-order independence ─────────────────────────────────────────────────
console.log('\n5. Hash is independent of input object key ordering');
{
  const a = { orderId: 'ord-1', event: 'requested', ts: 1_700_000_000, actorRole: 'provider', actorId: 'u1', lat: 28.5, lng: 77.3 };
  // Build the same object with reversed key insertion order
  const b = { actorId: 'u1', lng: 77.3, lat: 28.5, actorRole: 'provider', ts: 1_700_000_000, event: 'requested', orderId: 'ord-1' };
  const ha = await TrustProtocol.generateLedgerHash(a, 'GENESIS');
  const hb = await TrustProtocol.generateLedgerHash(b, 'GENESIS');
  assert(ha === hb, 'Hash is the same regardless of input property order');
}

// ── 6. Valid ledger passes verification ──────────────────────────────────────
console.log('\n6. Valid ledger passes integrity verification');
{
  const ledger = await buildLedger([
    { orderId: 'ord-1', event: 'requested', ts: 1_000, actorRole: 'provider', actorId: 'u1' },
    { orderId: 'ord-1', event: 'assigned',  ts: 2_000, actorRole: 'rider',    actorId: 'u2' },
    { orderId: 'ord-1', event: 'completed', ts: 3_000, actorRole: 'plant',    actorId: 'u3' }
  ]);
  const result = TrustProtocol.verifyLedgerIntegrity(ledger);
  assert(result.valid    === true,  '3-entry ledger is valid');
  assert(result.tampered === false, 'No tampering detected in clean ledger');
  assert(result.brokenIndex === null, 'brokenIndex is null for a clean ledger');
}

// ── 7. Tampered hash is detected ─────────────────────────────────────────────
console.log('\n7. Tampered hash at entry 0 is detected');
{
  const ledger = await buildLedger([
    { orderId: 'ord-2', event: 'requested', ts: 1_000, actorRole: 'provider', actorId: 'u1' },
    { orderId: 'ord-2', event: 'assigned',  ts: 2_000, actorRole: 'rider',    actorId: 'u2' }
  ]);
  // Attacker modifies entry[0].hash without updating entry[1].previousHash
  ledger[0] = { ...ledger[0], hash: '0x' + 'a'.repeat(64) };
  const result = TrustProtocol.verifyLedgerIntegrity(ledger);
  assert(result.valid        === false, 'Tampered ledger is invalid');
  assert(result.tampered     === true,  'Tamper flag is set');
  assert(result.brokenIndex  === 1,     'Break detected at entry 1 (its previousHash no longer matches)');
}

// ── 8. Broken previousHash link is detected ───────────────────────────────────
console.log('\n8. Directly broken previousHash link is detected');
{
  const ledger = await buildLedger([
    { orderId: 'ord-3', event: 'requested', ts: 1_000, actorRole: 'provider', actorId: 'u1' },
    { orderId: 'ord-3', event: 'assigned',  ts: 2_000, actorRole: 'rider',    actorId: 'u2' }
  ]);
  // Directly corrupt entry[1].previousHash
  ledger[1] = { ...ledger[1], previousHash: '0xbadhash' };
  const result = TrustProtocol.verifyLedgerIntegrity(ledger);
  assert(result.valid       === false, 'Ledger with broken link is invalid');
  assert(result.tampered    === true,  'Tamper flag is set');
  assert(result.brokenIndex === 1,     'Break correctly identified at entry 1');
}

// ── 9. Empty ledger is accepted as valid ─────────────────────────────────────
console.log('\n9. Empty ledger is valid');
{
  const r1 = TrustProtocol.verifyLedgerIntegrity([]);
  assert(r1.valid        === true,  'Empty array is valid');
  assert(r1.tampered     === false, 'No tamper flag for empty ledger');
  assert(r1.brokenIndex  === null,  'brokenIndex is null for empty ledger');

  const r2 = TrustProtocol.verifyLedgerIntegrity(null);
  assert(r2.valid === true, 'null input is treated as empty ledger');

  const r3 = TrustProtocol.verifyLedgerIntegrity(undefined);
  assert(r3.valid === true, 'undefined input is treated as empty ledger');
}

// ── 10. Trust event recording: single entry verifies correctly ────────────────
console.log('\n10. Single-entry ledger built with generateLedgerHash verifies correctly');
{
  const ledger = await buildLedger([
    { orderId: 'ord-5', event: 'requested', ts: 5_000, actorRole: 'provider', actorId: 'u1' }
  ]);
  assert(ledger[0].previousHash === 'GENESIS', 'First entry anchors to GENESIS');
  assert(ledger[0].hash.startsWith('0x'),       'Entry carries a hex hash');
  const result = TrustProtocol.verifyLedgerIntegrity(ledger);
  assert(result.valid === true, 'Single-entry ledger passes verification');
}

// ── 11. First entry without GENESIS is rejected ──────────────────────────────
console.log('\n11. First entry without GENESIS previousHash is rejected');
{
  const ledger = await buildLedger([
    { orderId: 'ord-6', event: 'requested', ts: 1_000, actorRole: 'provider', actorId: 'u1' }
  ]);
  ledger[0] = { ...ledger[0], previousHash: 'NOT-GENESIS' };
  const result = TrustProtocol.verifyLedgerIntegrity(ledger);
  assert(result.valid       === false, 'Missing GENESIS anchor is rejected');
  assert(result.brokenIndex === 0,     'Break reported at entry 0');
}

// ── 12. Entry with missing hash is rejected ───────────────────────────────────
console.log('\n12. Entry with missing hash field is rejected');
{
  const ledger = await buildLedger([
    { orderId: 'ord-7', event: 'requested', ts: 1_000, actorRole: 'provider', actorId: 'u1' }
  ]);
  const { hash: _removed, ...noHash } = ledger[0];
  const result = TrustProtocol.verifyLedgerIntegrity([noHash]);
  assert(result.valid       === false, 'Entry without hash field is rejected');
  assert(result.brokenIndex === 0,     'Break reported at the unhashed entry');
}

// ── 13. Regression: no TypeError from the previously missing methods ──────────
console.log('\n13. Regression: calling the methods never throws TypeError');
{
  let threw = false;
  try {
    const hash = await TrustProtocol.generateLedgerHash(
      { orderId: 'ord-r', event: 'test', ts: 1, actorRole: 'provider', actorId: 'u' },
      'GENESIS'
    );
    TrustProtocol.verifyLedgerIntegrity([]);
  } catch (e) {
    threw = true;
    console.error('  Exception caught:', e.message);
  }
  assert(!threw, 'No exception thrown when calling both new methods');
}

// ── 14. Existing methods remain intact ────────────────────────────────────────
console.log('\n14. Existing TrustProtocol methods still work correctly');
{
  const score = TrustProtocol.calculateScore({}, []);
  assert(score === 50, 'calculateScore returns 50 for new user with no history');

  const rank = TrustProtocol.getRankDetails(95);
  assert(rank.name === 'Diamond', 'getRankDetails returns Diamond for score 95');

  const reward = TrustProtocol.calculateReward(100, 95);
  assert(reward === 150, 'calculateReward applies Diamond 1.5× multiplier');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
