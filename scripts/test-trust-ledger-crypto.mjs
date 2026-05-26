import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { TrustProtocol } from '../src/trust.js';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

function buildBasePayload(overrides = {}) {
  return {
    orderId: 'order-001',
    event: 'picked_up',
    ts: 1716200000000,
    actorRole: 'rider',
    actorId: 'user-123',
    lat: 12.9716,
    lng: 77.5946,
    ...overrides
  };
}

async function buildV2Entry(payload, previousHash = 'GENESIS', id = 'evt-1') {
  const hash = await TrustProtocol.generateLedgerHash(payload, previousHash);
  return {
    _v: 2,
    id,
    trustScore: 0,
    previousHash,
    hash,
    sealed: true,
    verified: true,
    ...payload
  };
}

async function run() {
  const payload = buildBasePayload();

  // Case 1: same payload -> same hash
  const hashA = await TrustProtocol.generateLedgerHash(payload, 'GENESIS');
  const hashB = await TrustProtocol.generateLedgerHash(payload, 'GENESIS');
  assert.equal(hashA, hashB, 'Same payload must always produce same hash');

  // Case 2: reordered object keys -> identical hash
  const payloadReordered = {
    actorId: payload.actorId,
    lng: payload.lng,
    event: payload.event,
    previousHash: 'IGNORED_BY_CANONICALIZER',
    actorRole: payload.actorRole,
    orderId: payload.orderId,
    lat: payload.lat,
    ts: payload.ts
  };
  const hashC = await TrustProtocol.generateLedgerHash(payloadReordered, 'GENESIS');
  assert.equal(hashA, hashC, 'Key ordering must not affect hash output');

  // Build baseline valid chain
  const first = await buildV2Entry(buildBasePayload({ event: 'requested' }), 'GENESIS', 'evt-1');
  const second = await buildV2Entry(buildBasePayload({ event: 'assigned', ts: 1716200060000 }), first.hash, 'evt-2');
  const third = await buildV2Entry(buildBasePayload({ event: 'picked_up', ts: 1716200120000 }), second.hash, 'evt-3');
  const validChain = [first, second, third];

  const validResult = await TrustProtocol.verifyLedgerIntegrity(validChain);
  assert.equal(validResult.valid, true, 'Baseline chain should verify successfully');

  // Case 3: modified event -> verification fail
  const eventTampered = validChain.map((entry) => ({ ...entry }));
  eventTampered[1].event = 'completed';
  const eventTamperedResult = await TrustProtocol.verifyLedgerIntegrity(eventTampered);
  assert.equal(eventTamperedResult.valid, false, 'Modified event must fail verification');
  assert.equal(eventTamperedResult.brokenIndex, 1, 'Modified event should break at changed index');

  // Case 4: modified previousHash -> verification fail
  const prevHashTampered = validChain.map((entry) => ({ ...entry }));
  prevHashTampered[2].previousHash = first.hash;
  const prevHashTamperedResult = await TrustProtocol.verifyLedgerIntegrity(prevHashTampered);
  assert.equal(prevHashTamperedResult.valid, false, 'Modified previousHash must fail verification');
  assert.equal(prevHashTamperedResult.brokenIndex, 2, 'Previous hash tamper should point to changed index');

  // Case 5: tampered chain -> brokenIndex returned
  const hashTampered = validChain.map((entry) => ({ ...entry }));
  hashTampered[1].hash = `0x${'a'.repeat(64)}`;
  const hashTamperedResult = await TrustProtocol.verifyLedgerIntegrity(hashTampered);
  assert.equal(hashTamperedResult.valid, false, 'Tampered hash must fail verification');
  assert.equal(hashTamperedResult.brokenIndex, 1, 'Tampered hash should report broken index');

  // Case 6: legacy entries -> valid migration
  const legacyA = {
    _v: 1,
    id: 'legacy-1',
    ...buildBasePayload({ event: 'requested', ts: 1716200200000 })
  };
  const legacyAHash = await TrustProtocol.generateLedgerHash(legacyA, 'GENESIS');
  const legacyB = {
    _v: 1,
    id: 'legacy-2',
    ...buildBasePayload({ event: 'assigned', ts: 1716200260000 }),
    previousHash: legacyAHash
  };
  const legacyResult = await TrustProtocol.verifyLedgerIntegrity([legacyA, legacyB]);
  assert.equal(legacyResult.valid, true, 'Legacy chain should verify via deterministic migration path');

  // Case 7: cross-environment consistency via canonical serialization path parity
  const canonicalPayload = TrustProtocol.serializeLedgerPayload(payload, 'GENESIS');
  const hashViaGenerate = await TrustProtocol.generateLedgerHash(payload, 'GENESIS');
  const hashViaCompute = await TrustProtocol.computeLedgerHash(canonicalPayload);
  assert.equal(hashViaGenerate, hashViaCompute, 'Hash from generate and compute paths must match exactly');

  console.log('Trust ledger crypto regression tests passed');
}

run().catch((error) => {
  console.error('Trust ledger crypto regression tests failed:', error);
  process.exit(1);
});
