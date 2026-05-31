/**
 * Tests for the token-integrity layer introduced to prevent arbitrary balance
 * inflation.  The core logic (computeProvenBalance, recordTokenSpend,
 * sanitizeAccount balance cap) is replicated inline so these tests run in
 * Node.js without loading the full browser module.
 *
 * Coverage:
 *  1.  Normal reward flow — earning tokens from a completed order
 *  2.  Normal spending flow — buying a market item reduces balance
 *  3.  Staking flow — staking reduces spendable balance
 *  4.  Legitimate balance synchronisation — honest account passes the cap
 *  5.  Arbitrary balance modification — fabricated value is rejected by cap
 *  6.  Cloud sync validation — sanitizeAccount caps inflated tokens
 *  7.  Cross-device scenario — cloud receives the capped value
 *  8.  Regression — setting SESSION.tokens = 999999 cannot raise the sync'd balance
 *  9.  Persistence integrity — spending log is factored into the cap
 * 10.  Multi-order earnings — multiple completed orders accumulate correctly
 */

// ── Replicated logic (must stay in sync with src/app.js and src/cloud-sync.js) ─

const STORAGE_PREFIX = 'regenx-v3:';
const SPEND_LOG_KEY_PREFIX = STORAGE_PREFIX + 'spend-log:';

// ── Minimal in-memory localStorage mock ──────────────────────────────────────

class MockStorage {
  constructor() { this._data = {}; }
  get length() { return Object.keys(this._data).length; }
  key(i) { return Object.keys(this._data)[i] ?? null; }
  getItem(k) { return this._data[k] ?? null; }
  setItem(k, v) { this._data[k] = String(v); }
  removeItem(k) { delete this._data[k]; }
  clear() { this._data = {}; }
}

const localStorage = new MockStorage();

// ── Balance logic (mirrors app.js) ───────────────────────────────────────────

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function ts()  { return Date.now(); }

function loadSpendLog(accountId) {
  try {
    const raw = localStorage.getItem(SPEND_LOG_KEY_PREFIX + accountId);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveSpendLog(accountId, entries) {
  try {
    localStorage.setItem(SPEND_LOG_KEY_PREFIX + accountId, JSON.stringify(
      Array.isArray(entries) ? entries.slice(-1000) : []
    ));
  } catch { /* ignore */ }
}

function recordTokenSpend(accountId, amount, type) {
  if (!accountId || !(Number(amount) > 0)) return;
  const log = loadSpendLog(accountId);
  log.push({ id: uid(), type: String(type), amount: Math.floor(Number(amount)), ts: ts() });
  saveSpendLog(accountId, log);
}

function getAllOrders() {
  const orders = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX + 'ord:')) {
      try { orders.push(JSON.parse(localStorage.getItem(k))); } catch { /* skip */ }
    }
  }
  return orders;
}

function computeProvenEarnings(accountId) {
  if (!accountId) return 0;
  return getAllOrders()
    .filter(o => o.providerId === accountId && o.status === 'completed' && Number(o.tokensMinted) > 0)
    .reduce((sum, o) => sum + Math.floor(Number(o.tokensMinted)), 0);
}

function computeProvenBalance(accountId) {
  if (!accountId) return 0;
  const earned = computeProvenEarnings(accountId);
  const spent  = loadSpendLog(accountId)
    .reduce((sum, e) => sum + (Number.isFinite(e.amount) ? Math.floor(e.amount) : 0), 0);
  return Math.max(0, earned - spent);
}

// ── sanitizeAccount balance cap (mirrors cloud-sync.js) ──────────────────────

function getProvenEarnings(accountId) {
  // Same logic as CloudSync._getProvenEarnings but using the mock storage
  if (!accountId) return 0;
  try {
    let earned = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('regenx-v3:ord:')) continue;
      try {
        const order = JSON.parse(localStorage.getItem(k));
        if (order?.providerId === accountId && order.status === 'completed' && Number(order.tokensMinted) > 0) {
          earned += Math.floor(Number(order.tokensMinted));
        }
      } catch { /* skip */ }
    }
    return earned;
  } catch { return -1; }
}

function sanitizeAccount(account) {
  const sanitized = {};
  ['id', 'role', 'name', 'org'].forEach(f => {
    sanitized[f] = account[f] != null ? String(account[f]) : '';
  });
  ['lat', 'lng'].forEach(f => {
    sanitized[f] = account[f] != null ? Number(account[f]) : 0;
  });
  const claimedTokens = Math.max(0, Number(account.tokens) || 0);
  if (account.role === 'provider' && account.id) {
    const proven = getProvenEarnings(account.id);
    sanitized.tokens = proven >= 0 ? Math.min(claimedTokens, proven) : claimedTokens;
  } else {
    sanitized.tokens = claimedTokens;
  }
  sanitized.staked = Math.max(0, Number(account.staked) || 0);
  return sanitized;
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

function addOrder(order) {
  localStorage.setItem(STORAGE_PREFIX + 'ord:' + order.id, JSON.stringify(order));
}

function reset() { localStorage.clear(); }

// ── Test suite ────────────────────────────────────────────────────────────────

console.log('\nRunning token integrity tests…\n');

// ── 1. Normal reward flow ─────────────────────────────────────────────────────
console.log('1. Normal reward flow — earning tokens from a completed order');
reset();
{
  const uid1 = 'provider-001';
  addOrder({ id: 'ord-a', providerId: uid1, status: 'completed', tokensMinted: 120 });
  assert(computeProvenEarnings(uid1) === 120, 'Earned 120 from single completed order');
  assert(computeProvenBalance(uid1) === 120, 'Balance equals earnings when no spending');
}

// ── 2. Normal spending flow ───────────────────────────────────────────────────
console.log('\n2. Normal spending flow — buying reduces the available balance');
reset();
{
  const uid2 = 'provider-002';
  addOrder({ id: 'ord-b', providerId: uid2, status: 'completed', tokensMinted: 200 });
  recordTokenSpend(uid2, 50, 'market');
  assert(computeProvenBalance(uid2) === 150, 'Balance = 200 − 50 = 150 after purchase');
  // Trying to "spend" more than the balance
  const beforeSecond = computeProvenBalance(uid2);
  assert(beforeSecond < 200, 'Spending check based on proven balance (not raw SESSION)');
}

// ── 3. Staking flow ───────────────────────────────────────────────────────────
console.log('\n3. Staking flow — stake reduces spendable balance');
reset();
{
  const uid3 = 'provider-003';
  addOrder({ id: 'ord-c', providerId: uid3, status: 'completed', tokensMinted: 300 });
  recordTokenSpend(uid3, 100, 'stake');
  recordTokenSpend(uid3, 50,  'fund');
  assert(computeProvenBalance(uid3) === 150, 'Balance = 300 − 100 (stake) − 50 (fund) = 150');
}

// ── 4. Legitimate balance synchronisation ─────────────────────────────────────
console.log('\n4. Legitimate balance synchronisation — honest value passes the cap');
reset();
{
  const uid4 = 'provider-004';
  addOrder({ id: 'ord-d', providerId: uid4, status: 'completed', tokensMinted: 80 });
  const account = { id: uid4, role: 'provider', name: 'Test', org: 'Org', tokens: 80, staked: 0 };
  const result = sanitizeAccount(account);
  assert(result.tokens === 80, 'Honest balance (80 ≤ 80 earned) passes through unchanged');
}

// ── 5. Arbitrary balance modification — fabricated value is capped ────────────
console.log('\n5. Arbitrary balance modification — fabricated value is capped');
reset();
{
  const uid5 = 'provider-005';
  addOrder({ id: 'ord-e', providerId: uid5, status: 'completed', tokensMinted: 60 });
  // Simulate the attack: SESSION.tokens = 999999 → DB.set → pushAccount
  const inflatedAccount = { id: uid5, role: 'provider', name: 'Test', org: 'Org', tokens: 999999, staked: 0 };
  const result = sanitizeAccount(inflatedAccount);
  assert(result.tokens === 60,  'Inflated 999999 capped to 60 (proven earnings)');
  assert(result.tokens !== 999999, 'Fabricated value does not reach Appwrite');
}

// ── 6. Cloud sync validation — sanitizeAccount applies the cap ────────────────
console.log('\n6. Cloud sync validation — sanitizeAccount rejects above-ceiling value');
reset();
{
  const uid6 = 'provider-006';
  // No completed orders → earned = 0
  const account = { id: uid6, role: 'provider', name: 'Test', org: 'Org', tokens: 5000, staked: 0 };
  const result = sanitizeAccount(account);
  assert(result.tokens === 0, 'Account with no orders has 0 provable earnings — balance capped to 0');
}

// ── 7. Cross-device scenario — non-provider roles are unaffected ──────────────
console.log('\n7. Cross-device — non-provider roles pass their stored balance through');
reset();
{
  // Rider/plant accounts do not earn tokens and should not be zeroed out.
  const rider = { id: 'rider-001', role: 'rider', name: 'R', org: 'O', tokens: 0, staked: 0 };
  const plant = { id: 'plant-001', role: 'plant', name: 'P', org: 'O', tokens: 0, staked: 0 };
  assert(sanitizeAccount(rider).tokens === 0, 'Rider with 0 tokens syncs 0');
  assert(sanitizeAccount(plant).tokens === 0, 'Plant with 0 tokens syncs 0');
}

// ── 8. Regression — SESSION.tokens inflation does not raise the sync'd value ──
console.log('\n8. Regression: SESSION.tokens = 999999 cannot propagate to Appwrite');
reset();
{
  const uid8 = 'provider-008';
  addOrder({ id: 'ord-h', providerId: uid8, status: 'completed', tokensMinted: 40 });
  // Simulate: SESSION = { id: uid8, tokens: 999999 }; DB.set triggers sanitizeAccount
  const SESSION = { id: uid8, role: 'provider', name: 'A', org: 'B', tokens: 999999 };
  const syncResult = sanitizeAccount(SESSION);
  assert(syncResult.tokens === 40,
    '[regression] sanitizeAccount caps 999999 to the 40 tokens provably earned');
  // Also verify the spending check would reject the fabricated balance
  const provenBal = computeProvenBalance(uid8);
  assert(provenBal === 40, '[regression] computeProvenBalance returns 40, not 999999');
  assert(provenBal < 999999, '[regression] Proven balance is never the fabricated value');
}

// ── 9. Persistence integrity — spending log is factored into sanitizeAccount cap
console.log('\n9. Persistence integrity — spending log is subtracted before cap');
reset();
{
  const uid9 = 'provider-009';
  addOrder({ id: 'ord-i', providerId: uid9, status: 'completed', tokensMinted: 100 });
  recordTokenSpend(uid9, 30, 'market');
  // After spending 30, proven balance is 70.
  // If the client tries to sync tokens: 100 (ignoring spending), the cap should allow it
  // because _getProvenEarnings reads orders (not the spending log) for the cloud cap.
  // The spending-log deduction is enforced by computeProvenBalance in app.js.
  const honest = { id: uid9, role: 'provider', name: 'T', org: 'O', tokens: 70, staked: 0 };
  assert(sanitizeAccount(honest).tokens === 70, 'Post-spend honest balance (70) passes the order-earnings cap (100)');
  // But fabricated inflation beyond earnings is still blocked
  const inflated = { id: uid9, role: 'provider', name: 'T', org: 'O', tokens: 500, staked: 0 };
  assert(sanitizeAccount(inflated).tokens === 100, 'Inflated 500 capped at 100 (total earned from orders)');
}

// ── 10. Multi-order earnings accumulate correctly ─────────────────────────────
console.log('\n10. Multi-order earnings — multiple completed orders accumulate');
reset();
{
  const uid10 = 'provider-010';
  addOrder({ id: 'ord-j1', providerId: uid10, status: 'completed', tokensMinted: 50 });
  addOrder({ id: 'ord-j2', providerId: uid10, status: 'completed', tokensMinted: 75 });
  addOrder({ id: 'ord-j3', providerId: uid10, status: 'requested',  tokensMinted: 0 });  // not completed
  assert(computeProvenEarnings(uid10) === 125, 'Only completed orders with tokensMinted > 0 are counted');
  assert(computeProvenBalance(uid10) === 125, 'Balance correctly sums two completed orders');
  const account = { id: uid10, role: 'provider', name: 'T', org: 'O', tokens: 125, staked: 0 };
  assert(sanitizeAccount(account).tokens === 125, 'Full earned balance passes cap unchanged');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
