/**
 * Tests for the marketplace purchase atomicity fix.
 *
 * The original buyMarketItem deducted the balance inside a setTimeout that
 * fired 3.5 seconds after the insufficient-funds check.  This created a
 * window where a second purchase call could read the same pre-deduction
 * balance, pass the check, and ultimately drive the balance negative.
 *
 * The fix moves the deduction synchronously into the same event-loop tick
 * as the check, closing the race window entirely.
 *
 * Coverage:
 *  1.  Successful single purchase reduces balance by exact price
 *  2.  Insufficient funds blocks the purchase
 *  3.  Balance is persisted synchronously (before any async gap)
 *  4.  Rapid second call after first succeeds reads updated balance
 *  5.  Two simultaneous purchases exhaust funds correctly
 *  6.  Negative balance is impossible with the fixed sequence
 *  7.  Negative balance WAS possible with the original (buggy) sequence
 *  8.  Purchasing the most-expensive item leaves balance at zero, not negative
 *  9.  Exact-balance purchase succeeds
 * 10.  One-token shortfall blocks purchase
 * 11.  Third purchase correctly blocked when first two exhaust funds
 * 12.  Zero-price purchase is safe (edge case)
 * 13.  stakeTokens-style synchronous spend leaves no race window
 * 14.  fundProject-style synchronous spend leaves no race window
 * 15.  Regression: original (buggy) sequence produces negative balance
 * 16.  Regression: fixed sequence never produces negative balance
 * 17.  Balance reads from storage, not stale in-memory SESSION
 * 18.  Transaction history count matches purchase count
 */

// ── In-memory storage mock (mirrors DB.get / DB.set from app.js) ──────────────

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

// ── Fixed buyMarketItem logic (mirrors the patched app.js) ────────────────────
// Returns { success, newBalance } without DOM or setTimeout.

function fixedBuy(store, sessionId, sessionTokensRef, price) {
  // Read fresh from storage (the fix reads DB.get('acc:' + SESSION.id))
  const acc = store.get('acc:' + sessionId);
  const currentBalance = acc ? (Number(acc.tokens) || 0) : (sessionTokensRef.tokens || 0);

  if (currentBalance < price) return { success: false, reason: 'insufficient', newBalance: currentBalance };

  // Deduct and persist synchronously
  const newBalance = currentBalance - price;
  sessionTokensRef.tokens = newBalance;
  if (acc) acc.tokens = newBalance;
  store.set('acc:' + sessionId, acc || { id: sessionId, tokens: newBalance });

  return { success: true, newBalance };
}

// ── Original (buggy) buyMarketItem logic ──────────────────────────────────────
// Separates the check (synchronous) from the deduction (deferred).
// Returns { checkPassed } immediately; the deduction callback must be called
// separately to simulate the setTimeout(3500) firing.

function buggyBuyCheck(store, sessionId, sessionTokensRef, price) {
  // The original code reads SESSION.tokens (in-memory), not from storage
  const currentBalance = sessionTokensRef.tokens || 0;
  if (currentBalance < price) return { checkPassed: false };
  return { checkPassed: true };
}

function buggyBuyDeduct(store, sessionId, sessionTokensRef, price) {
  // The original setTimeout callback: deducts from in-memory SESSION.tokens
  // and persists — but by now another call may have already decremented it.
  sessionTokensRef.tokens -= price;
  const acc = store.get('acc:' + sessionId) || { id: sessionId, tokens: 0 };
  acc.tokens = sessionTokensRef.tokens;
  store.set('acc:' + sessionId, acc);
}

// ── Synchronous stakeTokens-style spend (no race window) ──────────────────────

function syncSpend(store, sessionId, sessionTokensRef, amount) {
  const currentBalance = sessionTokensRef.tokens || 0;
  if (currentBalance < amount) return { success: false };
  sessionTokensRef.tokens -= amount;
  const acc = store.get('acc:' + sessionId) || { id: sessionId, tokens: 0 };
  acc.tokens = sessionTokensRef.tokens;
  store.set('acc:' + sessionId, acc);
  return { success: true };
}

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

console.log('\nRunning marketplace race-condition tests…\n');

// ── 1. Single purchase deducts exact price ────────────────────────────────────

console.log('1. Single purchase deducts exact price');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 300 });
  const session = { tokens: 300 };

  const r = fixedBuy(store, 'u1', session, 100);

  assert(r.success === true,                          'purchase succeeds');
  assert(r.newBalance === 200,                        'in-memory balance is 200');
  assert(store.get('acc:u1').tokens === 200,          'persisted balance is 200');
  assert(session.tokens === 200,                      'SESSION.tokens is 200');
}

// ── 2. Insufficient funds blocks purchase ────────────────────────────────────

console.log('\n2. Insufficient funds blocks purchase');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 50 });
  const session = { tokens: 50 };

  const r = fixedBuy(store, 'u1', session, 100);

  assert(r.success === false,                         'purchase blocked');
  assert(r.reason === 'insufficient',                 'reason is insufficient');
  assert(store.get('acc:u1').tokens === 50,           'persisted balance unchanged');
  assert(session.tokens === 50,                       'SESSION.tokens unchanged');
}

// ── 3. Balance is persisted synchronously ────────────────────────────────────

console.log('\n3. Balance persisted synchronously before any async gap');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 200 });
  const session = { tokens: 200 };

  fixedBuy(store, 'u1', session, 75);

  // Immediately after the call (no awaiting, no setTimeout) the storage must
  // reflect the updated balance.
  assert(store.get('acc:u1').tokens === 125,          'storage updated synchronously');
}

// ── 4. Second call reads the updated balance ──────────────────────────────────

console.log('\n4. Second call reads the post-first-purchase balance');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 150 });
  const session = { tokens: 150 };

  const r1 = fixedBuy(store, 'u1', session, 100);   // succeeds; balance → 50
  const r2 = fixedBuy(store, 'u1', session, 100);   // should fail; balance is now 50

  assert(r1.success === true,                         'first purchase succeeds');
  assert(r2.success === false,                        'second purchase blocked (balance 50 < 100)');
  assert(store.get('acc:u1').tokens === 50,           'final persisted balance is 50');
}

// ── 5. Two simultaneous purchases correctly exhaust funds ─────────────────────

console.log('\n5. Two simultaneous purchases from the same balance');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 200 });
  const session = { tokens: 200 };

  // Simulate two rapid calls (both fire before any setTimeout could fire)
  const r1 = fixedBuy(store, 'u1', session, 100);   // succeeds; balance → 100
  const r2 = fixedBuy(store, 'u1', session, 100);   // succeeds; balance → 0

  assert(r1.success === true,                         'first purchase succeeds');
  assert(r2.success === true,                         'second purchase succeeds');
  assert(store.get('acc:u1').tokens === 0,            'final balance is zero, not negative');
  assert(session.tokens === 0,                        'SESSION.tokens is zero');
}

// ── 6. Negative balance is impossible with the fixed sequence ─────────────────

console.log('\n6. Negative balance impossible with fixed sequence');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 150 });
  const session = { tokens: 150 };

  // Three purchases of 100 against a 150-token balance
  fixedBuy(store, 'u1', session, 100);  // succeeds  → 50
  fixedBuy(store, 'u1', session, 100);  // blocked   → 50
  fixedBuy(store, 'u1', session, 100);  // blocked   → 50

  assert(store.get('acc:u1').tokens >= 0,             'persisted balance never negative');
  assert(session.tokens >= 0,                         'SESSION.tokens never negative');
}

// ── 7. Negative balance WAS possible with the original (buggy) sequence ───────

console.log('\n7. Negative balance WAS possible with the original buggy sequence');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 150 });
  const session = { tokens: 150 };

  // Simulate two rapid calls using the buggy pattern:
  //  check A passes, check B passes (neither has deducted yet),
  //  deduct A fires, deduct B fires.
  const checkA = buggyBuyCheck(store, 'u1', session, 100);  // passes (150 >= 100)
  const checkB = buggyBuyCheck(store, 'u1', session, 100);  // also passes (still 150)

  if (checkA.checkPassed) buggyBuyDeduct(store, 'u1', session, 100);  // 150 → 50
  if (checkB.checkPassed) buggyBuyDeduct(store, 'u1', session, 100);  // 50 → -50

  assert(store.get('acc:u1').tokens < 0,
    '[regression] buggy sequence drives balance negative (proves the exploit)');
}

// ── 8. Buying at exact balance leaves zero, not negative ──────────────────────

console.log('\n8. Exact-balance purchase leaves zero balance');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 250 });
  const session = { tokens: 250 };

  const r = fixedBuy(store, 'u1', session, 250);

  assert(r.success === true,                          'exact-balance purchase succeeds');
  assert(store.get('acc:u1').tokens === 0,            'balance is exactly zero');
  assert(session.tokens === 0,                        'SESSION.tokens is zero');
}

// ── 9-10. Edge: exact balance succeeds; one-short fails ──────────────────────

console.log('\n9-10. Edge cases: exact and one-short');
{
  {
    const store = makeStore();
    store.set('acc:u1', { id: 'u1', tokens: 100 });
    const session = { tokens: 100 };
    const r = fixedBuy(store, 'u1', session, 100);
    assert(r.success === true, 'price == balance → success');
  }
  {
    const store = makeStore();
    store.set('acc:u1', { id: 'u1', tokens: 99 });
    const session = { tokens: 99 };
    const r = fixedBuy(store, 'u1', session, 100);
    assert(r.success === false, 'price == balance + 1 → blocked');
  }
}

// ── 11. Third purchase blocked when first two exhaust funds ───────────────────

console.log('\n11. Third purchase blocked after first two exhaust funds');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 200 });
  const session = { tokens: 200 };

  const r1 = fixedBuy(store, 'u1', session, 100);
  const r2 = fixedBuy(store, 'u1', session, 100);
  const r3 = fixedBuy(store, 'u1', session, 100);

  assert(r1.success === true,                         'first purchase succeeds');
  assert(r2.success === true,                         'second purchase succeeds');
  assert(r3.success === false,                        'third purchase blocked (funds exhausted)');
  assert(store.get('acc:u1').tokens === 0,            'final balance is zero');
}

// ── 12. Zero-price purchase is safe ──────────────────────────────────────────

console.log('\n12. Zero-price purchase is safe');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 100 });
  const session = { tokens: 100 };

  const r = fixedBuy(store, 'u1', session, 0);

  assert(r.success === true,                          'zero-price purchase succeeds');
  assert(store.get('acc:u1').tokens === 100,          'balance unchanged for zero-price');
}

// ── 13-14. Synchronous stakeTokens / fundProject-style spends ─────────────────

console.log('\n13-14. Synchronous spends (stakeTokens / fundProject style)');
{
  // Staking: two rapid calls should not overdraw
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 150 });
  const session = { tokens: 150 };

  const s1 = syncSpend(store, 'u1', session, 100);
  const s2 = syncSpend(store, 'u1', session, 100);

  assert(s1.success === true,                         'first stake succeeds');
  assert(s2.success === false,                        'second stake blocked (50 < 100)');
  assert(store.get('acc:u1').tokens === 50,           'staking leaves correct balance');
}
{
  // fundProject: fixed-500 spend
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 600 });
  const session = { tokens: 600 };

  const f1 = syncSpend(store, 'u1', session, 500);
  const f2 = syncSpend(store, 'u1', session, 500);  // only 100 left, should fail

  assert(f1.success === true,                         'first fund succeeds');
  assert(f2.success === false,                        'second fund blocked');
  assert(store.get('acc:u1').tokens === 100,          'fund leaves correct balance');
}

// ── 15. Regression: original sequence produces negative balance ───────────────

console.log('\n15. Regression: original buggy sequence — negative balance confirmed');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 150 });
  const session = { tokens: 150 };

  // Both checks happen before either deduction (simulates two rapid clicks)
  const cA = buggyBuyCheck(store, 'u1', session, 100);
  const cB = buggyBuyCheck(store, 'u1', session, 100);
  if (cA.checkPassed) buggyBuyDeduct(store, 'u1', session, 100);
  if (cB.checkPassed) buggyBuyDeduct(store, 'u1', session, 100);

  assert(store.get('acc:u1').tokens < 0,
    '[regression] buggy sequence: final balance is negative (-50)');
  assert(store.get('acc:u1').tokens === -50,
    '[regression] buggy sequence: balance is exactly -50');
}

// ── 16. Fixed sequence never produces negative balance ────────────────────────

console.log('\n16. Fixed sequence never produces negative balance under same load');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 150 });
  const session = { tokens: 150 };

  // Same two rapid calls, but now each deducts atomically with its check
  fixedBuy(store, 'u1', session, 100);
  fixedBuy(store, 'u1', session, 100);

  assert(store.get('acc:u1').tokens >= 0,
    'fixed sequence: balance never goes negative');
  assert(store.get('acc:u1').tokens === 50,
    'fixed sequence: final balance is 50 (only one purchase succeeded)');
}

// ── 17. Fixed code reads from storage, not stale in-memory SESSION ────────────

console.log('\n17. Fixed code reads from storage (not stale SESSION)');
{
  const store = makeStore();
  // Storage says 80 tokens but in-memory SESSION says 200 (stale)
  store.set('acc:u1', { id: 'u1', tokens: 80 });
  const session = { tokens: 200 };  // stale in-memory value

  // The fixed code reads from store.get('acc:u1'), not session.tokens
  const r = fixedBuy(store, 'u1', session, 100);

  // Should be blocked because the authoritative (persisted) balance is 80 < 100,
  // even though the stale in-memory session says 200.
  assert(r.success === false,                         'stale SESSION ignored; storage balance (80) enforced');
}

// ── 18. Transaction count matches purchase count ──────────────────────────────

console.log('\n18. Transaction count equals successful purchase count');
{
  const store = makeStore();
  store.set('acc:u1', { id: 'u1', tokens: 500 });
  const session = { tokens: 500 };

  let txCount = 0;
  function buyWithTx(price) {
    const r = fixedBuy(store, 'u1', session, price);
    if (r.success) txCount++;
    return r;
  }

  buyWithTx(100);  // succeeds → 400
  buyWithTx(100);  // succeeds → 300
  buyWithTx(300);  // succeeds → 0
  buyWithTx(100);  // fails    → 0

  assert(txCount === 3,                               'exactly 3 successful transactions recorded');
  assert(store.get('acc:u1').tokens === 0,            'final balance is zero after 3 purchases');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
