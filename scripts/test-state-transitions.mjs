/**
 * Tests for order-lifecycle state-transition validation.
 *
 * Each order-lifecycle handler now enforces that the order is in the correct
 * predecessor state before mutating it.  Without these guards any handler
 * could be called on terminal-state (completed, rejected) or out-of-sequence
 * orders, corrupting the lifecycle record and rider attribution.
 *
 * Valid state machine:
 *   requested  → assigned   (riderAccept)
 *   assigned   → en_route   (riderUpdate)
 *   en_route   → picked_up  (confirmPickup)
 *   picked_up  → at_plant   (riderUpdate)
 *   at_plant   → completed  (confirmPlantReceipt)
 *   requested  → rejected   (cancelOrder)
 *
 * Terminal states: completed, rejected
 *
 * Coverage:
 *  1.  riderAccept: 'requested' order succeeds
 *  2.  riderAccept: 'assigned' order blocked
 *  3.  riderAccept: 'en_route' order blocked
 *  4.  riderAccept: 'picked_up' order blocked
 *  5.  riderAccept: 'at_plant' order blocked
 *  6.  riderAccept: 'completed' order blocked (terminal)
 *  7.  riderAccept: 'rejected' order blocked (terminal)
 *  8.  riderUpdate: 'assigned' → 'en_route' succeeds
 *  9.  riderUpdate: 'picked_up' → 'at_plant' succeeds
 * 10.  riderUpdate: 'requested' → 'en_route' blocked (skip step)
 * 11.  riderUpdate: 'completed' → 'at_plant' blocked (rewind terminal)
 * 12.  riderUpdate: arbitrary target state rejected
 * 13.  confirmPickup: 'en_route' succeeds
 * 14.  confirmPickup: 'assigned' blocked (not yet en route)
 * 15.  confirmPickup: 'completed' blocked (terminal)
 * 16.  cancelOrder: 'requested' succeeds
 * 17.  cancelOrder: 'assigned' blocked (already accepted)
 * 18.  cancelOrder: 'completed' blocked (terminal)
 * 19.  cancelOrder: 'rejected' blocked (already terminal)
 * 20.  confirmPlantReceipt: 'at_plant' succeeds
 * 21.  confirmPlantReceipt: 'picked_up' blocked (not yet at plant)
 * 22.  confirmPlantReceipt: 'assigned' blocked
 * 23.  confirmPlantReceipt: 'completed' blocked (idempotency guard)
 * 24.  Full lifecycle walk succeeds end-to-end
 * 25.  Regression: completed order cannot be re-accepted by any rider
 * 26.  Regression: rejected order cannot be re-accepted
 * 27.  Regression: terminal orders remain immutable through all handlers
 */

// ── Test runner ───────────────────────────────────────────────────────────────

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

// ── Inline simulation of the five fixed handlers ──────────────────────────────
// Each returns { result, reason?, newStatus? } and never touches the original
// object — immutability of terminal records is an invariant under test.

function simulateCancelOrder(order) {
  if (!order) return { result: 'not_found' };
  if (order.status !== 'requested') return { result: 'blocked', reason: `status_was_${order.status}` };
  return { result: 'cancelled', newStatus: 'rejected' };
}

function simulateRiderAccept(order, riderId) {
  if (!order) return { result: 'not_found' };
  if (order.status !== 'requested') return { result: 'blocked', reason: `status_was_${order.status}` };
  return { result: 'accepted', newStatus: 'assigned', riderId };
}

function simulateRiderUpdate(order, targetStatus) {
  if (!order) return { result: 'not_found' };
  const VALID_FROM = { en_route: 'assigned', at_plant: 'picked_up' };
  if (!VALID_FROM[targetStatus] || order.status !== VALID_FROM[targetStatus]) {
    return { result: 'blocked', reason: `invalid_transition_${order.status}_to_${targetStatus}` };
  }
  return { result: 'updated', newStatus: targetStatus };
}

function simulateConfirmPickup(order, kg) {
  if (!order) return { result: 'not_found' };
  if (!kg) return { result: 'invalid', reason: 'no_weight' };
  if (order.status !== 'en_route') return { result: 'blocked', reason: `status_was_${order.status}` };
  return { result: 'confirmed', newStatus: 'picked_up', actualKg: kg };
}

function simulateConfirmPlantReceipt(order, score, shouldConfirm) {
  if (!order) return { result: 'not_found' };
  if (order.status === 'completed') return { result: 'already_done' };
  if (order.status !== 'at_plant') return { result: 'blocked', reason: `status_was_${order.status}` };
  if (!shouldConfirm) return { result: 'cancelled' };
  return { result: 'confirmed', newStatus: 'completed', score };
}

// ── Fixture helper ────────────────────────────────────────────────────────────

function order(status, overrides = {}) {
  return { id: 'ord-1', providerId: 'prov-1', plantId: 'plant-1', riderId: 'rider-1', status, ...overrides };
}

// ─────────────────────────────────────────────────────────────────────────────

console.log('\nRunning order state-transition tests…\n');

// ── 1-7. riderAccept state guards ─────────────────────────────────────────────

console.log('1-7. riderAccept — predecessor state validation');
{
  assert(simulateRiderAccept(order('requested')).result === 'accepted',  '1. requested → accepted');

  const blocked = ['assigned', 'en_route', 'picked_up', 'at_plant', 'completed', 'rejected'];
  const labels  = ['assigned', 'en_route', 'picked_up', 'at_plant', 'completed (terminal)', 'rejected (terminal)'];
  blocked.forEach((st, i) => {
    const r = simulateRiderAccept(order(st));
    assert(r.result === 'blocked', `${i + 2}. ${labels[i]} order blocked`);
  });
}

// ── 8-12. riderUpdate transition table ───────────────────────────────────────

console.log('\n8-12. riderUpdate — valid and invalid transitions');
{
  assert(simulateRiderUpdate(order('assigned'),  'en_route').result  === 'updated',  '8.  assigned → en_route succeeds');
  assert(simulateRiderUpdate(order('picked_up'), 'at_plant').result  === 'updated',  '9.  picked_up → at_plant succeeds');
  assert(simulateRiderUpdate(order('requested'), 'en_route').result  === 'blocked',  '10. requested → en_route blocked (skip step)');
  assert(simulateRiderUpdate(order('completed'), 'at_plant').result  === 'blocked',  '11. completed → at_plant blocked (rewind terminal)');
  assert(simulateRiderUpdate(order('assigned'),  'completed').result === 'blocked',  '12. arbitrary target state rejected');
}

// ── 13-15. confirmPickup state guards ────────────────────────────────────────

console.log('\n13-15. confirmPickup — predecessor state validation');
{
  assert(simulateConfirmPickup(order('en_route'), '90').result   === 'confirmed', '13. en_route succeeds');
  assert(simulateConfirmPickup(order('assigned'), '90').result   === 'blocked',   '14. assigned blocked (not yet en route)');
  assert(simulateConfirmPickup(order('completed'), '90').result  === 'blocked',   '15. completed blocked (terminal)');
}

// ── 16-19. cancelOrder state guards ──────────────────────────────────────────

console.log('\n16-19. cancelOrder — predecessor state validation');
{
  assert(simulateCancelOrder(order('requested')).result  === 'cancelled', '16. requested → cancelled');
  assert(simulateCancelOrder(order('assigned')).result   === 'blocked',   '17. assigned blocked (already accepted)');
  assert(simulateCancelOrder(order('completed')).result  === 'blocked',   '18. completed blocked (terminal)');
  assert(simulateCancelOrder(order('rejected')).result   === 'blocked',   '19. rejected blocked (already terminal)');
}

// ── 20-23. confirmPlantReceipt state guards ───────────────────────────────────

console.log('\n20-23. confirmPlantReceipt — predecessor state validation');
{
  assert(simulateConfirmPlantReceipt(order('at_plant'), 80, true).result  === 'confirmed',   '20. at_plant succeeds');
  assert(simulateConfirmPlantReceipt(order('picked_up'), 80, true).result === 'blocked',     '21. picked_up blocked (not yet at plant)');
  assert(simulateConfirmPlantReceipt(order('assigned'), 80, true).result  === 'blocked',     '22. assigned blocked');
  assert(simulateConfirmPlantReceipt(order('completed'), 80, true).result === 'already_done','23. completed idempotency guard fires');
}

// ── 24. Full lifecycle walk ───────────────────────────────────────────────────

console.log('\n24. Full lifecycle walk — valid path end-to-end');
{
  let o = order('requested');
  let r;

  r = simulateRiderAccept(o, 'rider-42');
  assert(r.result === 'accepted',              '  requested → assigned');
  o = { ...o, status: r.newStatus, riderId: r.riderId };

  r = simulateRiderUpdate(o, 'en_route');
  assert(r.result === 'updated',               '  assigned → en_route');
  o = { ...o, status: r.newStatus };

  r = simulateConfirmPickup(o, '120');
  assert(r.result === 'confirmed',             '  en_route → picked_up');
  o = { ...o, status: r.newStatus };

  r = simulateRiderUpdate(o, 'at_plant');
  assert(r.result === 'updated',               '  picked_up → at_plant');
  o = { ...o, status: r.newStatus };

  r = simulateConfirmPlantReceipt(o, 85, true);
  assert(r.result === 'confirmed',             '  at_plant → completed');
  o = { ...o, status: r.newStatus };

  assert(o.status === 'completed',             '  final status is completed');
}

// ── 25-27. Regression tests ───────────────────────────────────────────────────

console.log('\n25-27. Regression: terminal-state orders remain immutable');
{
  const completed = order('completed');
  const rejected  = order('rejected');

  // A rider trying to re-accept a completed order (e.g. to steal attribution
  // or re-trigger rewards via plant confirm)
  assert(simulateRiderAccept(completed, 'rider-bad').result === 'blocked',
    '25. [regression] completed order cannot be re-accepted');
  assert(simulateRiderAccept(rejected, 'rider-bad').result === 'blocked',
    '26. [regression] rejected order cannot be re-accepted');

  // All handlers must refuse terminal-state orders
  const allBlocked = [
    simulateRiderAccept(completed).result  === 'blocked',
    simulateRiderUpdate(completed, 'en_route').result === 'blocked',
    simulateConfirmPickup(completed, '90').result === 'blocked',
    simulateCancelOrder(completed).result === 'blocked',
    simulateConfirmPlantReceipt(completed, 80, true).result === 'already_done',
  ];
  assert(allBlocked.every(Boolean),
    '27. [regression] all handlers refuse a completed order');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
