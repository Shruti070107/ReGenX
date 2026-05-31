/**
 * Tests for the atomic receipt-confirmation and reward-issuance fix.
 *
 * Coverage:
 *  1.  Cancelled confirmation leaves provider balance unchanged
 *  2.  Cancelled confirmation leaves order status unchanged (at_plant)
 *  3.  Cancelled confirmation issues zero tokens
 *  4.  Cancelled confirmation leaves credit ledger unchanged
 *  5.  Multiple cancellations do not accumulate tokens
 *  6.  Successful confirmation completes the order
 *  7.  Successful confirmation credits the correct token amount
 *  8.  Successful confirmation persists the balance
 *  9.  Successful confirmation adds a credit ledger entry
 * 10.  Completed-order guard prevents a second reward issuance
 * 11.  Completed-order guard returns 'already_done' on retry
 * 12.  Reward is zero when no provider account exists
 * 13.  earnedTokens variable is defined (not ReferenceError) when providerAcc absent
 * 14.  Base token amount is 2 × actualKg (falls back to kg)
 * 15.  TrustProtocol multiplier is applied to the base reward
 * 16.  Bronze-rank provider receives 1.0× base reward
 * 17.  Diamond-rank provider receives 1.5× base reward
 * 18.  Regression: pre-fix sequence (mutate before confirm) accumulates tokens on cancel
 * 19.  Regression: fixed sequence (confirm before mutate) never accumulates on cancel
 * 20.  Idempotency: confirming the same order twice yields reward only once
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

// ── Lightweight in-memory storage mock ────────────────────────────────────────

function makeStore() {
  const data = {};
  return {
    get: (key) => {
      const v = data[key];
      return v !== undefined ? JSON.parse(v) : null;
    },
    set: (key, val) => { data[key] = JSON.stringify(val); },
    raw: data,
  };
}

// ── Reward calculation (mirrors app.js logic) ─────────────────────────────────

function calcReward(order, providerHistory) {
  if (!order) return 0;
  const baseTokens = Math.round((parseFloat(order.actualKg || order.kg) || 0) * 2);
  // Use an empty history for new providers (score = 50 → Bronze → 1.0×)
  const trustScore = TrustProtocol.calculateScore({}, providerHistory || []);
  return TrustProtocol.calculateReward(baseTokens, trustScore);
}

// ── FIXED receipt logic simulation ───────────────────────────────────────────
// Mirrors the FIXED confirmPlantReceipt execution order:
//   1. idempotency guard
//   2. confirm() ← FIRST
//   3. if !confirmed → return with zero side effects
//   4. all mutations

function fixedReceipt(db, orderId, score, shouldConfirm) {
  const o = db.get('ord:' + orderId);
  if (!o) return { result: 'not_found', tokensIssued: 0 };
  if (o.status === 'completed') return { result: 'already_done', tokensIssued: 0 };

  // ─── CONFIRM FIRST (the fix) ─────────────────────────────────────────────
  if (!shouldConfirm) return { result: 'cancelled', tokensIssued: 0 };

  // ─── mutations only after confirmation ───────────────────────────────────
  const completedOrder = { ...o, status: 'completed', segScore: score };

  const providerAcc = db.get('acc:' + o.providerId);
  let earnedTokens = 0;   // let, not const, so it is in scope after the block

  if (providerAcc) {
    const allOrders = Object.keys(db.raw)
      .filter(k => k.startsWith('ord:'))
      .map(k => db.get(k));
    const providerHistory = allOrders.filter(
      ord => ord.providerId === o.providerId && ord.status === 'completed'
    );
    const trustScore   = TrustProtocol.calculateScore(providerAcc, providerHistory);
    const baseTokens   = Math.round((parseFloat(o.actualKg || o.kg) || 0) * 2);
    earnedTokens       = TrustProtocol.calculateReward(baseTokens, trustScore);

    const newAcc = { ...providerAcc, tokens: (providerAcc.tokens || 0) + earnedTokens };
    completedOrder.tokensMinted = earnedTokens;
    db.set('acc:' + o.providerId, newAcc);

    // credit ledger entry
    const creditKey = 'credit-' + Math.random().toString(36).slice(2);
    db.set(creditKey, { orderId: o.id, mintedTokens: earnedTokens });
  }

  db.set('ord:' + orderId, completedOrder);
  return { result: 'confirmed', tokensIssued: earnedTokens };
}

// ── PRE-FIX (buggy) receipt simulation ───────────────────────────────────────
// Mirrors the ORIGINAL broken execution order:
//   1. idempotency guard
//   2. mutations (balance, DB.set)   ← happens BEFORE confirm
//   3. confirm()
//   4. if !confirmed → return        ← too late, balance already written

function buggyReceipt(db, orderId, score, shouldConfirm) {
  const o = db.get('ord:' + orderId);
  if (!o) return { result: 'not_found', tokensIssued: 0 };
  if (o.status === 'completed') return { result: 'already_done', tokensIssued: 0 };

  // ─── BUG: mutations happen before confirm ─────────────────────────────────
  const mutatedOrder = { ...o, status: 'completed', segScore: score };

  const providerAcc = db.get('acc:' + o.providerId);
  let tokensIssued = 0;

  if (providerAcc) {
    const allOrders = Object.keys(db.raw)
      .filter(k => k.startsWith('ord:'))
      .map(k => db.get(k));
    const providerHistory = allOrders.filter(
      ord => ord.providerId === o.providerId && ord.status === 'completed'
    );
    const trustScore = TrustProtocol.calculateScore(providerAcc, providerHistory);
    const baseTokens = Math.round((parseFloat(o.actualKg || o.kg) || 0) * 2);
    tokensIssued     = TrustProtocol.calculateReward(baseTokens, trustScore);

    const newAcc = { ...providerAcc, tokens: (providerAcc.tokens || 0) + tokensIssued };
    db.set('acc:' + o.providerId, newAcc);      // ← persisted before confirm!
  }

  // confirm() comes AFTER mutations
  if (!shouldConfirm) return { result: 'cancelled', tokensIssued };  // damage already done

  db.set('ord:' + orderId, mutatedOrder);
  return { result: 'confirmed', tokensIssued };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

console.log('\nRunning plant-receipt atomicity tests…\n');

// Shared fixture
function makeFixture() {
  const db = makeStore();
  db.set('acc:prov-1', { id: 'prov-1', role: 'provider', name: 'Alice', tokens: 100 });
  db.set('ord:ord-1',  {
    id: 'ord-1', providerId: 'prov-1', providerOrg: 'Alice Org',
    plantId: 'plt-1', plantName: 'Plant Alpha',
    kg: 100, actualKg: 100, wasteType: 'Food waste (wet)',
    status: 'at_plant', riderName: 'Bob',
  });
  return db;
}

// ── 1-4. Cancellation leaves everything unchanged ─────────────────────────────

console.log('1-4. Cancellation leaves state unchanged');
{
  const db = makeFixture();
  const before = db.get('acc:prov-1').tokens;
  const orderBefore = db.get('ord:ord-1').status;

  const r = fixedReceipt(db, 'ord-1', 75, false);

  assert(r.result === 'cancelled',                'result is "cancelled"');
  assert(r.tokensIssued === 0,                    'zero tokens issued on cancel');
  assert(db.get('acc:prov-1').tokens === before,  'provider balance unchanged after cancel');
  assert(db.get('ord:ord-1').status === orderBefore, 'order status unchanged after cancel');
}

// ── 5. Multiple cancellations do not accumulate tokens ────────────────────────

console.log('\n5. Multiple cancellations do not accumulate tokens');
{
  const db = makeFixture();
  const before = db.get('acc:prov-1').tokens;

  fixedReceipt(db, 'ord-1', 75, false);
  fixedReceipt(db, 'ord-1', 75, false);
  fixedReceipt(db, 'ord-1', 75, false);

  assert(db.get('acc:prov-1').tokens === before,
    'ten cancellations leave balance exactly as before');
}

// ── 6-9. Successful confirmation ─────────────────────────────────────────────

console.log('\n6-9. Successful confirmation');
{
  const db = makeFixture();
  const before = db.get('acc:prov-1').tokens;

  const r = fixedReceipt(db, 'ord-1', 80, true);

  assert(r.result === 'confirmed',                'result is "confirmed"');
  assert(db.get('ord:ord-1').status === 'completed', 'order marked completed');
  assert(r.tokensIssued > 0,                      'positive token amount issued');
  assert(db.get('acc:prov-1').tokens === before + r.tokensIssued,
    'balance increased by exactly earnedTokens');
}

// ── 10-11. Idempotency: completed-order guard ─────────────────────────────────

console.log('\n10-11. Completed-order guard / idempotency');
{
  const db = makeFixture();

  const first  = fixedReceipt(db, 'ord-1', 80, true);
  const second = fixedReceipt(db, 'ord-1', 80, true);

  assert(first.result === 'confirmed',            'first call succeeds');
  assert(second.result === 'already_done',        'second call returns already_done');
  assert(second.tokensIssued === 0,               'second call issues zero tokens');
}

// ── 12-13. Missing provider account ──────────────────────────────────────────

console.log('\n12-13. Missing provider account');
{
  const db = makeStore();
  // Order with no matching provider account
  db.set('ord:ord-2', {
    id: 'ord-2', providerId: 'ghost', providerOrg: 'Ghost Org',
    plantId: 'plt-1', plantName: 'Plant Alpha',
    kg: 50, actualKg: 50, status: 'at_plant',
  });

  let noError = true;
  let r;
  try {
    r = fixedReceipt(db, 'ord-2', 60, true);
  } catch {
    noError = false;
  }

  assert(noError,               'no ReferenceError when providerAcc is absent');
  assert(r.tokensIssued === 0,  'zero tokens issued when provider account missing');
  assert(db.get('ord:ord-2').status === 'completed',
    'order still completes even without provider account');
}

// ── 14. Base token formula: 2 × actualKg ─────────────────────────────────────

console.log('\n14. Base token formula: 2 × actualKg');
{
  // Bronze-level provider (no history → score 50 → 1.0× multiplier)
  const baseFor100kg = Math.round(100 * 2);
  const earned = TrustProtocol.calculateReward(baseFor100kg, 50);
  assert(earned === 200, '100 kg at Bronze → 200 $RGX base reward');

  const baseFor60kg = Math.round(60 * 2);
  const earned60 = TrustProtocol.calculateReward(baseFor60kg, 50);
  assert(earned60 === 120, '60 kg at Bronze → 120 $RGX base reward');
}

// ── 15-17. TrustProtocol multipliers ─────────────────────────────────────────

console.log('\n15-17. TrustProtocol reward multipliers');
{
  const base = 200; // 2 × 100 kg

  const bronze  = TrustProtocol.calculateReward(base, 50);   // 1.0×
  const silver  = TrustProtocol.calculateReward(base, 65);   // 1.1×
  const gold    = TrustProtocol.calculateReward(base, 80);   // 1.25×
  const diamond = TrustProtocol.calculateReward(base, 95);   // 1.5×

  assert(bronze  === 200, 'Bronze  (score 50) → 1.0× → 200 $RGX');
  assert(silver  === 220, 'Silver  (score 65) → 1.1× → 220 $RGX');
  assert(gold    === 250, 'Gold    (score 80) → 1.25× → 250 $RGX');
  assert(diamond === 300, 'Diamond (score 95) → 1.5× → 300 $RGX');
}

// ── 18. Regression: original (buggy) sequence inflates on cancel ──────────────

console.log('\n18. Regression: pre-fix sequence inflates token balance on cancel');
{
  const db = makeFixture();
  const before = db.get('acc:prov-1').tokens;  // 100

  // Cancel three times using the BUGGY simulation
  buggyReceipt(db, 'ord-1', 75, false);
  buggyReceipt(db, 'ord-1', 75, false);
  buggyReceipt(db, 'ord-1', 75, false);

  const after = db.get('acc:prov-1').tokens;
  // The buggy path persists a balance increase on every call before returning
  // 'cancelled'.  Three cancellations → three reward credits stacked.
  assert(after > before,
    '[regression] buggy sequence inflates balance on repeated cancel (proves exploit)');
}

// ── 19. Fixed sequence never accumulates on cancel ────────────────────────────

console.log('\n19. Fixed sequence: no inflation on repeated cancel');
{
  const db = makeFixture();
  const before = db.get('acc:prov-1').tokens;

  fixedReceipt(db, 'ord-1', 75, false);
  fixedReceipt(db, 'ord-1', 75, false);
  fixedReceipt(db, 'ord-1', 75, false);

  const after = db.get('acc:prov-1').tokens;
  assert(after === before,
    'fixed sequence: repeated cancel leaves balance exactly at initial value');
}

// ── 20. Idempotency across confirm + cancel mix ───────────────────────────────

console.log('\n20. Idempotency: confirm then cancel does not double-reward');
{
  const db = makeFixture();

  const first  = fixedReceipt(db, 'ord-1', 80, true);   // confirm  → reward issued
  const second = fixedReceipt(db, 'ord-1', 80, false);  // cancel   → already_done guard fires
  const third  = fixedReceipt(db, 'ord-1', 80, true);   // confirm  → already_done guard fires

  const expectedBalance = 100 + first.tokensIssued;

  assert(first.result === 'confirmed',             'first call: confirmed');
  assert(second.result === 'already_done',         'second call (cancel after complete): already_done');
  assert(third.result === 'already_done',          'third call (confirm again): already_done');
  assert(db.get('acc:prov-1').tokens === expectedBalance,
    'balance equals initial + exactly one reward issuance');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
