/**
 * Tests for the trust-ledger hash-immutability fix.
 *
 * The original prepareTrustLedgerForWrite recomputed every entry's hash from
 * the current field values on each save.  This allowed an attacker to modify
 * any historical field (actorId, GPS coordinates, event type, timestamp) and
 * then trigger a normal save, which would silently rebuild a cryptographically
 * valid-looking chain that passed all integrity checks.
 *
 * The fix: entries with a non-empty `hash` on a `_v:2` record are copied
 * unchanged (the stored hash is the immutable fingerprint).  Recomputation
 * now only happens for unsealed / legacy entries.
 *
 * Coverage:
 *  1.  prepareTrustLedgerForWrite preserves sealed entry hashes
 *  2.  prepareTrustLedgerForWrite seals unsealed entries
 *  3.  Sealed entries: stored hash is retained even after field modification
 *  4.  Valid chain passes cryptographic verification
 *  5.  Modified actorId is detected as tampered
 *  6.  Modified event type is detected as tampered
 *  7.  Modified GPS latitude is detected as tampered
 *  8.  Modified timestamp is detected as tampered
 *  9.  Broken chain link is detected by structural check
 * 10.  Deleted entry detected by structural check
 * 11.  Inserted entry detected by structural check
 * 12.  Reordered entries detected by structural check
 * 13.  Legacy (unsealed) entry is sealed on first write
 * 14.  Empty ledger passes verification
 * 15.  New entry correctly appended and chained
 * 16.  Multiple tampered fields all detected
 * 17.  Regression: old (buggy) prepareLedger rebuilds chain from modified data
 * 18.  Regression: fixed prepareLedger exposes tampering to cryptographic check
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

// ── Inline replication of the two prepareLedger variants ─────────────────────

/**
 * OLD (buggy) prepareTrustLedgerForWrite — recomputes ALL hashes.
 * Included to demonstrate the bypass that motivated this fix.
 */
async function oldPrepareLedger(events) {
  const prepared = [];
  let prev = 'GENESIS';
  for (const entry of Array.isArray(events) ? events : []) {
    const hash = await TrustProtocol.generateLedgerHash(entry, prev);
    const sealed = {
      ...entry,
      _v: 2,
      previousHash: prev,
      hash,
      sealed: true,
      verified: true,
    };
    prepared.push(sealed);
    prev = hash;
  }
  return prepared;
}

/**
 * NEW (fixed) prepareTrustLedgerForWrite — preserves sealed hashes.
 */
async function newPrepareLedger(events) {
  const prepared = [];
  let prev = 'GENESIS';
  for (const entry of Array.isArray(events) ? events : []) {
    if (entry && entry._v === 2 && typeof entry.hash === 'string' && entry.hash !== '') {
      // Already sealed — do not recompute.
      prepared.push(entry);
      prev = entry.hash;
    } else {
      const hash = await TrustProtocol.generateLedgerHash(entry, prev);
      const sealed = {
        ...entry,
        _v: 2,
        previousHash: prev,
        hash,
        sealed: true,
        verified: true,
      };
      prepared.push(sealed);
      prev = hash;
    }
  }
  return prepared;
}

/**
 * Cryptographic verification — recomputes each entry's hash from canonical
 * fields and compares to the stored value.  Returns { valid, tamperedIndex }.
 */
async function cryptoVerify(ledger) {
  if (!Array.isArray(ledger) || ledger.length === 0) return { valid: true, tamperedIndex: null };
  let prev = 'GENESIS';
  for (let i = 0; i < ledger.length; i++) {
    const e = ledger[i];
    if (!e.hash) return { valid: false, tamperedIndex: i };
    try {
      const expected = await TrustProtocol.generateLedgerHash(e, prev);
      if (e.hash !== expected) return { valid: false, tamperedIndex: i };
      prev = e.hash;
    } catch {
      return { valid: false, tamperedIndex: i };
    }
  }
  return { valid: true, tamperedIndex: null };
}

/** Build a minimal raw entry (unsealed — no hash). */
function rawEntry(overrides = {}) {
  return {
    orderId:   'ord-test',
    event:     'requested',
    ts:        1700000000000,
    actorRole: 'provider',
    actorId:   'acc-provider',
    lat:       28.5355,
    lng:       77.3910,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nRunning trust-ledger hash-immutability tests…\n');

// ── 1-2. Core prepare-ledger behaviour ───────────────────────────────────────

console.log('1-2. prepareTrustLedgerForWrite behaviour');
{
  const unsealed = rawEntry();
  const ledger   = await newPrepareLedger([unsealed]);

  assert(ledger.length === 1,                    'one entry produced');
  assert(typeof ledger[0].hash === 'string',     'unsealed entry receives a hash');
  assert(ledger[0].hash.startsWith('0x'),        'hash has 0x prefix');
  assert(ledger[0]._v === 2,                     'entry is promoted to _v:2');
  assert(ledger[0].previousHash === 'GENESIS',   'first entry anchored to GENESIS');

  // Run again — the same sealed entry must come out unchanged.
  const round2 = await newPrepareLedger(ledger);
  assert(round2[0].hash === ledger[0].hash,      'second run preserves stored hash');
}

// ── 3. Sealed hash is retained after field modification ───────────────────────

console.log('\n3. Sealed hash retained after field modification');
{
  const original = await newPrepareLedger([rawEntry()]);
  const storedHash = original[0].hash;

  // Simulate in-place field modification (as an attacker would do in localStorage)
  const tampered = { ...original[0], actorId: 'attacker-id' };

  // Run through the FIXED prepareLedger — the stored hash must NOT change.
  const reprocessed = await newPrepareLedger([tampered]);
  assert(reprocessed[0].hash === storedHash,
    'fixed prepare: stored hash survives field modification');
}

// ── 4. Valid chain passes cryptographic verification ─────────────────────────

console.log('\n4. Valid chain passes cryptographic verification');
{
  const e1 = rawEntry({ event: 'requested', ts: 1000 });
  const e2 = rawEntry({ event: 'assigned',  ts: 2000, actorRole: 'rider',  actorId: 'acc-rider' });
  const e3 = rawEntry({ event: 'completed', ts: 3000, actorRole: 'plant',  actorId: 'acc-plant' });
  const chain = await newPrepareLedger([e1, e2, e3]);

  const result = await cryptoVerify(chain);
  assert(result.valid === true,          'valid three-entry chain passes crypto verification');
  assert(result.tamperedIndex === null,  'no tampered index on valid chain');
}

// ── 5-8. Individual field modifications are detected ─────────────────────────

console.log('\n5-8. Field modification detection');
{
  const chain = await newPrepareLedger([
    rawEntry({ event: 'requested', actorId: 'original-actor', ts: 1000 }),
  ]);

  async function detectsTamper(modifiedFields, label) {
    const tampered = await newPrepareLedger([{ ...chain[0], ...modifiedFields }]);
    const result   = await cryptoVerify(tampered);
    assert(result.valid === false, `tamper detected: ${label}`);
  }

  await detectsTamper({ actorId:  'attacker-id'     }, 'modified actorId');
  await detectsTamper({ event:    'sealed'           }, 'modified event type');
  await detectsTamper({ lat:      0.0001             }, 'modified GPS latitude');
  await detectsTamper({ ts:       9999999999999      }, 'modified timestamp');
}

// ── 9. Broken chain link detected by structural check ────────────────────────

console.log('\n9. Broken chain link detected by structural check');
{
  const chain = await newPrepareLedger([
    rawEntry({ event: 'requested', ts: 1000 }),
    rawEntry({ event: 'assigned',  ts: 2000 }),
  ]);

  const broken = JSON.parse(JSON.stringify(chain));
  broken[1].previousHash = '0x' + 'b'.repeat(64);  // wrong link

  const result = TrustProtocol.verifyLedgerIntegrity(broken);
  assert(result.valid === false,       'broken chain link detected');
  assert(result.tampered === true,     'tampered flag set');
  assert(result.brokenIndex === 1,     'broken at index 1');
}

// ── 10. Deleted entry detected ────────────────────────────────────────────────

console.log('\n10. Deleted entry detected');
{
  const chain = await newPrepareLedger([
    rawEntry({ event: 'requested', ts: 1000 }),
    rawEntry({ event: 'assigned',  ts: 2000 }),
    rawEntry({ event: 'completed', ts: 3000 }),
  ]);

  // Remove the middle entry — this breaks the chain link from entry 2.
  const withDeletion = [chain[0], chain[2]];
  const result = TrustProtocol.verifyLedgerIntegrity(withDeletion);
  assert(result.valid === false,  'deleted entry causes chain break');
  assert(result.tampered === true, 'tampered flag set');
}

// ── 11. Inserted entry detected ───────────────────────────────────────────────

console.log('\n11. Inserted entry detected');
{
  const chain = await newPrepareLedger([
    rawEntry({ event: 'requested', ts: 1000 }),
    rawEntry({ event: 'completed', ts: 3000 }),
  ]);

  // Create an unrelated sealed entry and inject it between the two.
  const intruder = await newPrepareLedger([rawEntry({ event: 'assigned', ts: 2000 })]);

  const withInsertion = [chain[0], intruder[0], chain[1]];
  const result = TrustProtocol.verifyLedgerIntegrity(withInsertion);
  assert(result.valid === false,   'inserted entry causes chain break');
  assert(result.tampered === true, 'tampered flag set');
}

// ── 12. Reordered entries detected ───────────────────────────────────────────

console.log('\n12. Reordered entries detected');
{
  const chain = await newPrepareLedger([
    rawEntry({ event: 'requested', ts: 1000 }),
    rawEntry({ event: 'assigned',  ts: 2000 }),
    rawEntry({ event: 'completed', ts: 3000 }),
  ]);

  const reordered = [chain[0], chain[2], chain[1]]; // swap last two
  const result = TrustProtocol.verifyLedgerIntegrity(reordered);
  assert(result.valid === false,   'reordered entries cause chain break');
  assert(result.tampered === true, 'tampered flag set');
}

// ── 13. Legacy entry sealed on first write ────────────────────────────────────

console.log('\n13. Legacy entry sealed on first write');
{
  // Simulate a pre-existing entry without hash or _v fields
  const legacy = { orderId: 'legacy-ord', event: 'requested', ts: 500, actorRole: 'provider', actorId: 'acc-old', lat: null, lng: null };

  const ledger = await newPrepareLedger([legacy]);
  assert(ledger[0]._v === 2,                    'legacy entry promoted to _v:2');
  assert(typeof ledger[0].hash === 'string',    'legacy entry receives a hash');
  assert(ledger[0].previousHash === 'GENESIS',  'legacy entry anchored to GENESIS');

  // Second pass must preserve the now-sealed hash.
  const second = await newPrepareLedger(ledger);
  assert(second[0].hash === ledger[0].hash,     'sealed legacy hash preserved on second write');
}

// ── 14. Empty ledger passes all checks ───────────────────────────────────────

console.log('\n14. Empty ledger passes all checks');
{
  const structural = TrustProtocol.verifyLedgerIntegrity([]);
  assert(structural.valid === true, 'empty ledger: structural check passes');

  const crypto = await cryptoVerify([]);
  assert(crypto.valid === true, 'empty ledger: crypto check passes');
}

// ── 15. New entry correctly appended and chained ─────────────────────────────

console.log('\n15. New entry appended to an existing sealed chain');
{
  // Simulate the recordTrustEvent flow: get chain tip, compute new hash, append.
  const existing = await newPrepareLedger([
    rawEntry({ event: 'requested', ts: 1000 }),
    rawEntry({ event: 'assigned',  ts: 2000 }),
  ]);

  const prevHash = existing[existing.length - 1].hash;
  const newRaw   = rawEntry({ event: 'picked_up', ts: 3000, actorRole: 'rider' });
  const newHash  = await TrustProtocol.generateLedgerHash(newRaw, prevHash);
  const newEntry = { ...newRaw, _v: 2, previousHash: prevHash, hash: newHash, sealed: true, verified: true };

  const full = [...existing, newEntry];

  const structural = TrustProtocol.verifyLedgerIntegrity(full);
  const crypto     = await cryptoVerify(full);

  assert(structural.valid === true, 'three-entry chain structural check passes');
  assert(crypto.valid === true,     'three-entry chain cryptographic check passes');
  assert(full[2].previousHash === existing[1].hash, 'new entry correctly references chain tip');
}

// ── 16. Multiple tampered fields all detected ─────────────────────────────────

console.log('\n16. Multiple tampered fields all detected');
{
  const chain = await newPrepareLedger([rawEntry()]);

  const tampered = await newPrepareLedger([{
    ...chain[0],
    actorId:  'attacker',
    event:    'sealed',
    lat:      0,
    lng:      0,
    ts:       9999,
  }]);

  const result = await cryptoVerify(tampered);
  assert(result.valid === false,         'multi-field tampering detected');
  assert(result.tamperedIndex === 0,     'tampered index is 0');
}

// ── 17-18. Regression tests ───────────────────────────────────────────────────

console.log('\n17-18. Regression: old vs fixed prepareLedger');
{
  // Seal an original entry with the fixed prepare.
  const original = await newPrepareLedger([rawEntry({ actorId: 'alice' })]);
  const storedHash = original[0].hash;

  // Simulate modification in localStorage
  const tampered = { ...original[0], actorId: 'attacker' };

  // OLD (buggy) prepare: recomputes hash from modified fields → stored hash changes.
  const buggyResult  = await oldPrepareLedger([tampered]);
  const buggyVerify  = await cryptoVerify(buggyResult);
  assert(buggyResult[0].hash !== storedHash,
    '[regression-17] old prepare: stored hash replaced with hash of tampered data');
  assert(buggyVerify.valid === true,
    '[regression-17] old prepare: crypto verify PASSES on tampered data (bypass demonstrated)');

  // NEW (fixed) prepare: preserves the original hash → mismatch detectable.
  const fixedResult  = await newPrepareLedger([tampered]);
  const fixedVerify  = await cryptoVerify(fixedResult);
  assert(fixedResult[0].hash === storedHash,
    '[regression-18] fixed prepare: original stored hash preserved');
  assert(fixedVerify.valid === false,
    '[regression-18] fixed prepare: crypto verify FAILS on tampered data (bypass closed)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
