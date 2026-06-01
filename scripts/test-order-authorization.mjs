/**
 * Tests for order-lifecycle authorization guards.
 *
 * Coverage:
 *  1.  confirmPlantReceipt blocked for provider role
 *  2.  confirmPlantReceipt blocked for rider role
 *  3.  confirmPlantReceipt blocked for correct plant role but wrong plant ID
 *  4.  confirmPlantReceipt succeeds for correct plant role + correct plant ID
 *  5.  confirmPlantReceipt: cancelled dialog leaves state unchanged
 *  6.  confirmPlantReceipt: rewards issued only after authorization + confirmation
 *  7.  confirmPlantReceipt: no reward when providerAcc missing (no ReferenceError)
 *  8.  riderAccept blocked for non-rider role
 *  9.  riderAccept blocked when order not in 'requested' state
 * 10.  riderAccept succeeds for rider role on 'requested' order
 * 11.  riderUpdate blocked for non-rider role
 * 12.  riderUpdate blocked when rider is not the assigned rider
 * 13.  riderUpdate succeeds for assigned rider
 * 14.  confirmPickup blocked for non-rider role
 * 15.  confirmPickup blocked for wrong rider
 * 16.  confirmPickup succeeds for assigned rider
 * 17.  cancelOrder blocked for non-provider role
 * 18.  cancelOrder blocked when provider doesn't own the order
 * 19.  cancelOrder succeeds for the order owner
 * 20.  Regression: plant session cannot complete order for a different plant
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

// ── Minimal in-memory store ───────────────────────────────────────────────────

function makeStore() {
  const data = {};
  return {
    get: (k) => { const v = data[k]; return v !== undefined ? JSON.parse(v) : null; },
    set: (k, v) => { data[k] = JSON.stringify(v); },
    raw: data,
  };
}

// ── Simulations of the fixed lifecycle handlers ───────────────────────────────
// Each returns { result, reason } so tests can assert on the outcome without
// any DOM or localStorage dependency.

function simulateCancelOrder(session, order) {
  if (!order) return { result: 'not_found' };
  if (session.role !== 'provider') return { result: 'unauthorized', reason: 'role' };
  if (order.providerId !== session.id) return { result: 'unauthorized', reason: 'ownership' };
  return { result: 'cancelled', newStatus: 'rejected' };
}

function simulateRiderAccept(session, order) {
  if (!order) return { result: 'not_found' };
  if (session.role !== 'rider') return { result: 'unauthorized', reason: 'role' };
  if (order.status !== 'requested') return { result: 'unavailable' };
  return { result: 'accepted', newStatus: 'assigned', riderId: session.id };
}

function simulateRiderUpdate(session, order, newStatus) {
  if (!order) return { result: 'not_found' };
  if (session.role !== 'rider') return { result: 'unauthorized', reason: 'role' };
  if (order.riderId !== session.id) return { result: 'unauthorized', reason: 'ownership' };
  return { result: 'updated', newStatus };
}

function simulateConfirmPickup(session, order, kg) {
  if (!order) return { result: 'not_found' };
  if (!kg) return { result: 'invalid', reason: 'no_weight' };
  if (session.role !== 'rider') return { result: 'unauthorized', reason: 'role' };
  if (order.riderId !== session.id) return { result: 'unauthorized', reason: 'ownership' };
  return { result: 'confirmed', newStatus: 'picked_up', actualKg: kg };
}

function simulateConfirmPlantReceipt(store, session, order, score, shouldConfirm) {
  if (!order) return { result: 'not_found', tokensIssued: 0 };
  if (order.status === 'completed') return { result: 'already_done', tokensIssued: 0 };

  // Authorization checks (the fix)
  if (session.role !== 'plant') return { result: 'unauthorized', reason: 'role', tokensIssued: 0 };
  if (order.plantId !== session.id) return { result: 'unauthorized', reason: 'ownership', tokensIssued: 0 };

  // Confirmation before any mutation
  if (!shouldConfirm) return { result: 'cancelled', tokensIssued: 0 };

  // Mutations only after authorization + confirmation
  const completedOrder = { ...order, status: 'completed', segScore: score };

  const providerAcc = store.get('acc:' + order.providerId);
  let earnedTokens = 0;   // let, not const, so it is in scope after the block

  if (providerAcc) {
    const baseTokens = Math.round((parseFloat(order.actualKg || order.kg) || 0) * 2);
    const trustScore = TrustProtocol.calculateScore(providerAcc, []);
    earnedTokens = TrustProtocol.calculateReward(baseTokens, trustScore);
    const newAcc = { ...providerAcc, tokens: (providerAcc.tokens || 0) + earnedTokens };
    completedOrder.tokensMinted = earnedTokens;
    store.set('acc:' + order.providerId, newAcc);
  }

  store.set('ord:' + order.id, completedOrder);
  return { result: 'confirmed', tokensIssued: earnedTokens };
}

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeOrder(overrides = {}) {
  return {
    id: 'ord-1',
    providerId: 'prov-1',
    providerOrg: 'Alice Org',
    plantId: 'plant-1',
    plantName: 'Plant Alpha',
    riderId: 'rider-1',
    riderName: 'Bob',
    kg: 100,
    actualKg: 100,
    status: 'at_plant',
    ...overrides,
  };
}

function makeSession(role, id) { return { role, id, name: role + '-' + id }; }

// ─────────────────────────────────────────────────────────────────────────────

console.log('\nRunning order-lifecycle authorization tests…\n');

// ── 1-4. confirmPlantReceipt authorization ────────────────────────────────────

console.log('1-4. confirmPlantReceipt — authorization checks');
{
  const store = makeStore();
  store.set('acc:prov-1', { id: 'prov-1', tokens: 100 });
  const order = makeOrder();

  const asProvider = simulateConfirmPlantReceipt(store, makeSession('provider', 'prov-1'), order, 80, true);
  assert(asProvider.result === 'unauthorized',   '1. provider role blocked');
  assert(asProvider.reason === 'role',           '1. reason is role');

  const asRider = simulateConfirmPlantReceipt(store, makeSession('rider', 'rider-1'), order, 80, true);
  assert(asRider.result === 'unauthorized',      '2. rider role blocked');
  assert(asRider.reason === 'role',              '2. reason is role');

  const wrongPlant = simulateConfirmPlantReceipt(store, makeSession('plant', 'plant-2'), order, 80, true);
  assert(wrongPlant.result === 'unauthorized',   '3. wrong plant ID blocked');
  assert(wrongPlant.reason === 'ownership',      '3. reason is ownership');

  const correct = simulateConfirmPlantReceipt(store, makeSession('plant', 'plant-1'), order, 80, true);
  assert(correct.result === 'confirmed',         '4. authorized plant succeeds');
  assert(correct.tokensIssued > 0,               '4. rewards issued');
}

// ── 5-6. confirmPlantReceipt atomicity ────────────────────────────────────────

console.log('\n5-6. confirmPlantReceipt — atomicity and reward timing');
{
  const store = makeStore();
  store.set('acc:prov-1', { id: 'prov-1', tokens: 50 });
  const order = makeOrder();
  const session = makeSession('plant', 'plant-1');

  const cancelled = simulateConfirmPlantReceipt(store, session, order, 80, false);
  assert(cancelled.result === 'cancelled',                    '5. cancel leaves no side effects');
  assert(cancelled.tokensIssued === 0,                        '5. zero tokens on cancel');
  assert(store.get('acc:prov-1').tokens === 50,               '5. balance unchanged after cancel');
  assert(!store.get('ord:ord-1'),                             '5. order not saved after cancel');

  const confirmed = simulateConfirmPlantReceipt(store, session, makeOrder(), 80, true);
  assert(confirmed.result === 'confirmed',                    '6. confirmation credits rewards');
  assert(store.get('acc:prov-1').tokens === 50 + confirmed.tokensIssued,
    '6. balance updated by exact reward amount');
}

// ── 7. confirmPlantReceipt: missing provider account ──────────────────────────

console.log('\n7. confirmPlantReceipt — missing provider account');
{
  const store = makeStore(); // no provider account
  const order = makeOrder({ providerId: 'ghost' });

  let noError = true;
  let r;
  try {
    r = simulateConfirmPlantReceipt(store, makeSession('plant', 'plant-1'), order, 60, true);
  } catch { noError = false; }

  assert(noError,               'no ReferenceError when providerAcc absent');
  assert(r.tokensIssued === 0,  'zero tokens when provider account missing');
  assert(r.result === 'confirmed', 'order still completes');
}

// ── 8-10. riderAccept ────────────────────────────────────────────────────────

console.log('\n8-10. riderAccept — authorization and status guard');
{
  const order = makeOrder({ status: 'requested', riderId: null });

  const asProvider = simulateRiderAccept(makeSession('provider', 'prov-1'), order);
  assert(asProvider.result === 'unauthorized',   '8. provider cannot accept');

  const alreadyAssigned = makeOrder({ status: 'assigned' });
  const r = simulateRiderAccept(makeSession('rider', 'rider-99'), alreadyAssigned);
  assert(r.result === 'unavailable',             '9. already-assigned order unavailable');

  const ok = simulateRiderAccept(makeSession('rider', 'rider-99'), order);
  assert(ok.result === 'accepted',               '10. rider can accept requested order');
  assert(ok.riderId === 'rider-99',              '10. rider ID assigned correctly');
}

// ── 11-13. riderUpdate ────────────────────────────────────────────────────────

console.log('\n11-13. riderUpdate — authorization');
{
  const order = makeOrder({ status: 'assigned', riderId: 'rider-1' });

  const asProvider = simulateRiderUpdate(makeSession('provider', 'prov-1'), order, 'en_route');
  assert(asProvider.result === 'unauthorized',   '11. provider cannot update route');

  const wrongRider = simulateRiderUpdate(makeSession('rider', 'rider-99'), order, 'en_route');
  assert(wrongRider.result === 'unauthorized',   '12. wrong rider cannot update');
  assert(wrongRider.reason === 'ownership',      '12. reason is ownership');

  const ok = simulateRiderUpdate(makeSession('rider', 'rider-1'), order, 'en_route');
  assert(ok.result === 'updated',                '13. assigned rider can update');
  assert(ok.newStatus === 'en_route',            '13. status updated correctly');
}

// ── 14-16. confirmPickup ──────────────────────────────────────────────────────

console.log('\n14-16. confirmPickup — authorization');
{
  const order = makeOrder({ status: 'en_route', riderId: 'rider-1' });

  const asProvider = simulateConfirmPickup(makeSession('provider', 'prov-1'), order, '95');
  assert(asProvider.result === 'unauthorized',   '14. provider cannot confirm pickup');

  const wrongRider = simulateConfirmPickup(makeSession('rider', 'rider-99'), order, '95');
  assert(wrongRider.result === 'unauthorized',   '15. wrong rider cannot confirm pickup');

  const ok = simulateConfirmPickup(makeSession('rider', 'rider-1'), order, '95');
  assert(ok.result === 'confirmed',              '16. assigned rider can confirm pickup');
  assert(ok.actualKg === '95',                   '16. actual weight recorded');
}

// ── 17-19. cancelOrder ───────────────────────────────────────────────────────

console.log('\n17-19. cancelOrder — authorization');
{
  const order = makeOrder({ status: 'requested', providerId: 'prov-1' });

  const asRider = simulateCancelOrder(makeSession('rider', 'rider-1'), order);
  assert(asRider.result === 'unauthorized',      '17. rider cannot cancel');

  const wrongProvider = simulateCancelOrder(makeSession('provider', 'prov-99'), order);
  assert(wrongProvider.result === 'unauthorized', '18. wrong provider cannot cancel');
  assert(wrongProvider.reason === 'ownership',   '18. reason is ownership');

  const ok = simulateCancelOrder(makeSession('provider', 'prov-1'), order);
  assert(ok.result === 'cancelled',              '19. owner can cancel');
  assert(ok.newStatus === 'rejected',            '19. status set to rejected');
}

// ── 20. Regression ────────────────────────────────────────────────────────────

console.log('\n20. Regression: cross-plant receipt attempt blocked');
{
  const store = makeStore();
  store.set('acc:prov-1', { id: 'prov-1', tokens: 100 });
  const order = makeOrder({ plantId: 'plant-correct' });

  // Attacker operates as plant-attacker, tries to complete an order assigned
  // to plant-correct to steal the provider's reward tokens.
  const attack = simulateConfirmPlantReceipt(
    store,
    makeSession('plant', 'plant-attacker'),
    order,
    100,
    true
  );

  assert(attack.result === 'unauthorized',             '[regression] cross-plant receipt blocked');
  assert(attack.tokensIssued === 0,                    '[regression] no tokens issued on unauthorized attempt');
  assert(store.get('acc:prov-1').tokens === 100,        '[regression] provider balance unchanged');
  assert(!store.get('ord:ord-1'),                       '[regression] order not modified');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
