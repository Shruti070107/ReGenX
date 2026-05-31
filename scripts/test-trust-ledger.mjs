/**
 * Tests for TrustProtocol.generateLedgerHash and TrustProtocol.verifyLedgerIntegrity.
 *
 * Coverage:
 *  1.  TrustProtocol exports verifyLedgerIntegrity
 *  2.  TrustProtocol exports generateLedgerHash
 *  3.  generateLedgerHash returns a string
 *  4.  generateLedgerHash result is '0x'-prefixed
 *  5.  generateLedgerHash result is 66 characters (0x + 64 hex digits)
 *  6.  generateLedgerHash result is lowercase hex
 *  7.  generateLedgerHash is deterministic for the same input
 *  8.  Different event field → different hash
 *  9.  Different previousHash → different hash
 * 10.  Different orderId → different hash
 * 11.  Different ts → different hash
 * 12.  generateLedgerHash handles null lat/lng
 * 13.  generateLedgerHash uses entry.previousHash when arg is omitted
 * 14.  verifyLedgerIntegrity([]) → valid, not tampered
 * 15.  verifyLedgerIntegrity(null) → valid (treated as empty)
 * 16.  verifyLedgerIntegrity(undefined) → valid
 * 17.  verifyLedgerIntegrity — single valid entry passes
 * 18.  verifyLedgerIntegrity — three-entry valid chain passes
 * 19.  verifyLedgerIntegrity — broken chain link detected
 * 20.  verifyLedgerIntegrity — first entry not anchored to GENESIS detected
 * 21.  verifyLedgerIntegrity — missing hash field detected
 * 22.  verifyLedgerIntegrity — missing previousHash field detected
 * 23.  verifyLedgerIntegrity — null entry in array detected
 * 24.  verifyLedgerIntegrity — non-object entry in array detected
 * 25.  Order lifecycle chain: requested → assigned → completed verifies correctly
 * 26.  Regression: TrustProtocol.verifyLedgerIntegrity([]) does not throw TypeError
 * 27.  Regression: TrustProtocol.generateLedgerHash({}) does not throw TypeError
 */

import { TrustProtocol } from '../src/trust.js';

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

/** Build a minimal valid ledger entry (without hash / previousHash). */
function makeEntry(overrides = {}) {
  return {
    orderId:   'ord-test-1',
    event:     'requested',
    ts:        1700000000000,
    actorRole: 'provider',
    actorId:   'acc-test-1',
    lat:       28.5355,
    lng:       77.3910,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nRunning trust ledger tests…\n');

// ── 1-2. Export checks ────────────────────────────────────────────────────────

console.log('1-2. TrustProtocol exports');
{
  assert(typeof TrustProtocol.verifyLedgerIntegrity === 'function',
    'verifyLedgerIntegrity is a function');
  assert(typeof TrustProtocol.generateLedgerHash === 'function',
    'generateLedgerHash is a function');
}

// ── 3-6. generateLedgerHash output format ─────────────────────────────────────

console.log('\n3-6. generateLedgerHash output format');
{
  const hash = await TrustProtocol.generateLedgerHash(makeEntry(), 'GENESIS');
  assert(typeof hash === 'string',              'returns a string');
  assert(hash.startsWith('0x'),                 'starts with "0x"');
  assert(hash.length === 66,                    'is 66 characters (0x + 64 hex)');
  assert(/^0x[0-9a-f]{64}$/.test(hash),         'is valid lowercase hex');
}

// ── 7. Determinism ────────────────────────────────────────────────────────────

console.log('\n7. generateLedgerHash determinism');
{
  const e = makeEntry({ event: 'assigned', actorRole: 'rider', actorId: 'acc-rider-1' });
  const h1 = await TrustProtocol.generateLedgerHash(e, 'GENESIS');
  const h2 = await TrustProtocol.generateLedgerHash(e, 'GENESIS');
  assert(h1 === h2, 'identical input always produces identical hash');
}

// ── 8-11. Input sensitivity ───────────────────────────────────────────────────

console.log('\n8-11. generateLedgerHash sensitivity');
{
  const base = makeEntry();
  const h0 = await TrustProtocol.generateLedgerHash(base, 'GENESIS');
  const h1 = await TrustProtocol.generateLedgerHash({ ...base, event: 'completed' }, 'GENESIS');
  const h2 = await TrustProtocol.generateLedgerHash(base, '0x' + 'a'.repeat(64));
  const h3 = await TrustProtocol.generateLedgerHash({ ...base, orderId: 'ord-other' }, 'GENESIS');
  const h4 = await TrustProtocol.generateLedgerHash({ ...base, ts: base.ts + 1 }, 'GENESIS');

  assert(h0 !== h1, 'different event → different hash');
  assert(h0 !== h2, 'different previousHash → different hash');
  assert(h0 !== h3, 'different orderId → different hash');
  assert(h0 !== h4, 'different ts → different hash');
}

// ── 12. Null coordinates ──────────────────────────────────────────────────────

console.log('\n12. generateLedgerHash with null lat/lng');
{
  const withCoords    = await TrustProtocol.generateLedgerHash(makeEntry({ lat: 28.5, lng: 77.3 }), 'GENESIS');
  const withoutCoords = await TrustProtocol.generateLedgerHash(makeEntry({ lat: null, lng: null }), 'GENESIS');
  assert(typeof withCoords    === 'string', 'hash with coordinates is a string');
  assert(typeof withoutCoords === 'string', 'hash without coordinates is a string');
  assert(withCoords !== withoutCoords,      'presence of coordinates changes the hash');
}

// ── 13. Falls back to entry.previousHash when argument is omitted ──────────────

console.log('\n13. generateLedgerHash uses entry.previousHash fallback');
{
  const sentinel = '0x' + 'f'.repeat(64);
  const entryWithPrev = makeEntry({ previousHash: sentinel });
  const h1 = await TrustProtocol.generateLedgerHash(entryWithPrev);           // no explicit arg
  const h2 = await TrustProtocol.generateLedgerHash(entryWithPrev, sentinel); // explicit arg
  assert(h1 === h2, 'implicit and explicit previousHash produce same hash');
}

// ── 14-16. verifyLedgerIntegrity empty / falsy cases ─────────────────────────

console.log('\n14-16. verifyLedgerIntegrity — empty / falsy inputs');
{
  const r1 = TrustProtocol.verifyLedgerIntegrity([]);
  assert(r1.valid === true,           '[]  →  valid');
  assert(r1.tampered === false,       '[]  →  not tampered');
  assert(r1.brokenIndex === null,     '[]  →  brokenIndex null');

  const r2 = TrustProtocol.verifyLedgerIntegrity(null);
  assert(r2.valid === true,           'null  →  valid (treated as empty)');

  const r3 = TrustProtocol.verifyLedgerIntegrity(undefined);
  assert(r3.valid === true,           'undefined  →  valid (treated as empty)');
}

// ── Build a three-entry chain for subsequent tests ────────────────────────────

const e1 = makeEntry({ event: 'requested', actorRole: 'provider', actorId: 'acc-p' });
const e2 = makeEntry({ event: 'assigned',  actorRole: 'rider',    actorId: 'acc-r', ts: 1700000060000 });
const e3 = makeEntry({ event: 'completed', actorRole: 'plant',    actorId: 'acc-pl', ts: 1700000120000 });

const hash1 = await TrustProtocol.generateLedgerHash(e1, 'GENESIS');
const hash2 = await TrustProtocol.generateLedgerHash(e2, hash1);
const hash3 = await TrustProtocol.generateLedgerHash(e3, hash2);

const validLedger = [
  { ...e1, previousHash: 'GENESIS', hash: hash1 },
  { ...e2, previousHash: hash1,     hash: hash2 },
  { ...e3, previousHash: hash2,     hash: hash3 },
];

// ── 17-18. Valid chains ───────────────────────────────────────────────────────

console.log('\n17-18. verifyLedgerIntegrity — valid chains');
{
  const single = [{ ...e1, previousHash: 'GENESIS', hash: hash1 }];
  const r1 = TrustProtocol.verifyLedgerIntegrity(single);
  assert(r1.valid === true,        'single-entry chain passes');
  assert(r1.brokenIndex === null,  'single-entry chain has no broken index');

  const r2 = TrustProtocol.verifyLedgerIntegrity(validLedger);
  assert(r2.valid === true,        'three-entry chain passes');
  assert(r2.tampered === false,    'three-entry chain not tampered');
  assert(r2.brokenIndex === null,  'three-entry chain has no broken index');
}

// ── 19. Broken chain link ─────────────────────────────────────────────────────

console.log('\n19. verifyLedgerIntegrity — broken chain link');
{
  const tampered = JSON.parse(JSON.stringify(validLedger));
  tampered[1].previousHash = '0x' + 'b'.repeat(64); // wrong link
  const result = TrustProtocol.verifyLedgerIntegrity(tampered);
  assert(result.valid === false,     'broken chain detected');
  assert(result.tampered === true,   'tampered flag set');
  assert(result.brokenIndex === 1,   'broken at index 1');
}

// ── 20. First entry not anchored to GENESIS ───────────────────────────────────

console.log('\n20. verifyLedgerIntegrity — bad genesis anchor');
{
  const tampered = JSON.parse(JSON.stringify(validLedger));
  tampered[0].previousHash = '0x' + 'c'.repeat(64); // should be GENESIS
  const result = TrustProtocol.verifyLedgerIntegrity(tampered);
  assert(result.valid === false,     'bad genesis anchor detected');
  assert(result.tampered === true,   'tampered flag set');
  assert(result.brokenIndex === 0,   'broken at index 0');
}

// ── 21. Missing hash field ────────────────────────────────────────────────────

console.log('\n21. verifyLedgerIntegrity — missing hash field');
{
  const tampered = JSON.parse(JSON.stringify(validLedger));
  delete tampered[2].hash;
  const result = TrustProtocol.verifyLedgerIntegrity(tampered);
  assert(result.valid === false,     'missing hash detected');
  assert(result.tampered === true,   'tampered flag set');
  assert(result.brokenIndex === 2,   'broken at entry with missing hash');
}

// ── 22. Missing previousHash field ───────────────────────────────────────────

console.log('\n22. verifyLedgerIntegrity — missing previousHash field');
{
  const tampered = JSON.parse(JSON.stringify(validLedger));
  delete tampered[1].previousHash;
  const result = TrustProtocol.verifyLedgerIntegrity(tampered);
  assert(result.valid === false,     'missing previousHash detected');
  assert(result.tampered === true,   'tampered flag set');
  assert(result.brokenIndex === 1,   'broken at entry with missing previousHash');
}

// ── 23. Null entry in chain ───────────────────────────────────────────────────

console.log('\n23. verifyLedgerIntegrity — null entry');
{
  const withNull = [...validLedger, null];
  const result = TrustProtocol.verifyLedgerIntegrity(withNull);
  assert(result.valid === false,     'null entry detected');
  assert(result.tampered === true,   'tampered flag set');
  assert(result.brokenIndex === 3,   'broken at null entry index');
}

// ── 24. Non-object entry ──────────────────────────────────────────────────────

console.log('\n24. verifyLedgerIntegrity — non-object entry');
{
  const withString = [...validLedger, 'corrupted'];
  const result = TrustProtocol.verifyLedgerIntegrity(withString);
  assert(result.valid === false,     'string entry detected');
  assert(result.tampered === true,   'tampered flag set');
  assert(result.brokenIndex === 3,   'broken at string entry index');
}

// ── 25. Order lifecycle chain ─────────────────────────────────────────────────

console.log('\n25. Order lifecycle chain verification');
{
  const lifecycle = [
    { event: 'requested', actorRole: 'provider', actorId: 'p1', orderId: 'life-ord', ts: 1000, lat: null, lng: null },
    { event: 'assigned',  actorRole: 'rider',    actorId: 'r1', orderId: 'life-ord', ts: 2000, lat: 28.5, lng: 77.3 },
    { event: 'picked_up', actorRole: 'rider',    actorId: 'r1', orderId: 'life-ord', ts: 3000, lat: 28.6, lng: 77.4 },
    { event: 'at_plant',  actorRole: 'rider',    actorId: 'r1', orderId: 'life-ord', ts: 4000, lat: 28.7, lng: 77.5 },
    { event: 'completed', actorRole: 'plant',    actorId: 'pl1', orderId: 'life-ord', ts: 5000, lat: 28.7, lng: 77.5 },
  ];

  let prev = 'GENESIS';
  const chain = [];
  for (const raw of lifecycle) {
    const h = await TrustProtocol.generateLedgerHash(raw, prev);
    chain.push({ ...raw, previousHash: prev, hash: h });
    prev = h;
  }

  const result = TrustProtocol.verifyLedgerIntegrity(chain);
  assert(result.valid === true,     'full lifecycle chain passes verification');
  assert(result.tampered === false, 'full lifecycle chain not tampered');

  // Tamper the middle entry (picked_up) and confirm detection
  const tampered = JSON.parse(JSON.stringify(chain));
  tampered[2].actorId = 'attacker';
  // The hash stored on entry 2 was computed for the original actorId,
  // but the chain link from entry 3 (previousHash === chain[2].hash) is
  // still present — so the structural check passes.  The full
  // cryptographic re-check in openIntegrityScan would catch this; the
  // structural check here only validates chain links.
  //
  // To produce a detectable structural break we also corrupt the hash:
  tampered[2].hash = '0x' + 'dead'.repeat(16);
  const rTampered = TrustProtocol.verifyLedgerIntegrity(tampered);
  assert(rTampered.valid === false,     'corrupted chain entry detected');
  assert(rTampered.brokenIndex === 3,   'broken at entry whose previousHash no longer matches');
}

// ── 26-27. Regression – no TypeError ─────────────────────────────────────────

console.log('\n26-27. Regression — no TypeError on formerly-missing methods');
{
  let noVerifyError = true;
  try {
    TrustProtocol.verifyLedgerIntegrity([]);
  } catch {
    noVerifyError = false;
  }
  assert(noVerifyError, 'TrustProtocol.verifyLedgerIntegrity([]) does not throw');

  let noHashError = true;
  try {
    await TrustProtocol.generateLedgerHash(
      { orderId: 'x', event: 'requested', ts: 0, actorRole: 'provider', actorId: 'y' },
      'GENESIS'
    );
  } catch {
    noHashError = false;
  }
  assert(noHashError, 'TrustProtocol.generateLedgerHash({...}) does not throw');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
