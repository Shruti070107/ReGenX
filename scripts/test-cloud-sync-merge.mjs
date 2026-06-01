/**
 * Tests for the CloudSync stale-overwrite fix.
 *
 * hydrateFromCloud originally merged accounts as { ...local, ...cloud },
 * letting the cloud snapshot unconditionally overwrite every local field.
 * A device that earned tokens while offline and reconnected before the
 * offline queue was flushed would silently lose those tokens.
 *
 * The fix introduces _syncTs timestamps on every local account write
 * (via DB.set) and in every Appwrite push (via sanitizeAccount).
 * hydrateFromCloud now uses those timestamps to decide which side is
 * authoritative, with a Math.max safety net for legacy records that
 * predate the _syncTs field.
 *
 * Coverage:
 *  1.  Original (buggy) merge: local newer tokens overwritten by cloud
 *  2.  Fixed merge: local newer tokens preserved when localTs > cloudTs
 *  3.  Fixed merge: cloud wins when cloudTs >= localTs (normal reconnect)
 *  4.  Fixed merge: same timestamp → cloud wins
 *  5.  Legacy records (no _syncTs): Math.max preserves higher local tokens
 *  6.  Legacy records: Math.max preserves higher local staked
 *  7.  Legacy records: cloud-only fields are still applied
 *  8.  When local is newer: re-push triggered (cloud brought up to date)
 *  9.  When cloud is newer: re-push NOT triggered
 * 10.  Non-financial fields (name, role) follow cloud in cloud-wins path
 * 11.  Non-financial fields (name, role) follow local in local-wins path
 * 12.  Local newer: cloud-only fields populated into merged result
 * 13.  Empty local account treated as fully stale (cloud wins)
 * 14.  Empty cloud account falls back to local (no merge performed)
 * 15.  _syncTs is preserved in merged result
 * 16.  Regression: offline token earn survives reconnect hydration
 * 17.  Regression: multi-device divergence resolves by timestamp
 */

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

// ── Core merge logic (mirrors the patched hydrateFromCloud) ───────────────────

function mergeAccount(localAcc, cloudAccount) {
  if (!cloudAccount) return { merged: localAcc, repushed: false };

  const local = localAcc || {};
  const localTs = Number(local._syncTs)       || 0;
  const cloudTs = Number(cloudAccount._syncTs) || 0;

  let merged;
  let repushed = false;

  if (localTs > cloudTs) {
    // Local is newer — local wins, cloud is brought up to date.
    merged   = { ...cloudAccount, ...local };
    repushed = true;
  } else {
    // Cloud is current — standard cloud-wins merge.
    merged = { ...local, ...cloudAccount };

    // Safety net for legacy records without _syncTs.
    if (localTs === 0 && cloudTs === 0) {
      if (typeof local.tokens === 'number') {
        merged.tokens = Math.max(Number(local.tokens), Number(cloudAccount.tokens) || 0);
      }
      if (typeof local.staked === 'number') {
        merged.staked = Math.max(Number(local.staked), Number(cloudAccount.staked) || 0);
      }
    }
  }

  return { merged, repushed };
}

// ── Original (buggy) merge for regression comparison ─────────────────────────

function buggyMergeAccount(localAcc, cloudAccount) {
  if (!cloudAccount) return { merged: localAcc || {}, repushed: false };
  const merged = { ...(localAcc || {}), ...cloudAccount };
  return { merged, repushed: false };
}

// ─────────────────────────────────────────────────────────────────────────────

console.log('\nRunning CloudSync stale-overwrite tests…\n');

// ── 1. Regression: original buggy merge loses offline tokens ──────────────────

console.log('1. Regression: original (buggy) merge overwrites local tokens');
{
  const local = { id: 'u1', tokens: 150, _syncTs: 2000 };  // newer offline earn
  const cloud = { id: 'u1', tokens: 100, _syncTs: 1000 };  // stale Appwrite snapshot

  const { merged } = buggyMergeAccount(local, cloud);
  assert(merged.tokens === 100,
    '[regression] buggy merge: cloud tokens (100) overwrite local tokens (150)');
}

// ── 2. Fixed: local newer → local tokens preserved ────────────────────────────

console.log('\n2. Fixed merge: local newer → local tokens preserved');
{
  const local = { id: 'u1', tokens: 150, _syncTs: 2000 };
  const cloud = { id: 'u1', tokens: 100, _syncTs: 1000 };

  const { merged, repushed } = mergeAccount(local, cloud);
  assert(merged.tokens === 150,   'local tokens (150) preserved when local is newer');
  assert(repushed === true,       'push-to-cloud triggered to bring Appwrite up to date');
}

// ── 3. Cloud newer → cloud values applied ────────────────────────────────────

console.log('\n3. Fixed merge: cloud newer → cloud values applied');
{
  const local = { id: 'u1', tokens: 100, _syncTs: 1000 };
  const cloud = { id: 'u1', tokens: 200, _syncTs: 2000 };  // Device A earned tokens

  const { merged, repushed } = mergeAccount(local, cloud);
  assert(merged.tokens === 200,  'cloud tokens (200) applied when cloud is newer');
  assert(repushed === false,     'no re-push when cloud is already authoritative');
}

// ── 4. Same timestamp → cloud wins ───────────────────────────────────────────

console.log('\n4. Same timestamp → cloud wins');
{
  const ts   = 1000;
  const local = { id: 'u1', tokens: 80,  _syncTs: ts };
  const cloud = { id: 'u1', tokens: 120, _syncTs: ts };

  const { merged } = mergeAccount(local, cloud);
  assert(merged.tokens === 120, 'cloud wins on tie');
}

// ── 5-6. Legacy records (no _syncTs): Math.max for financial fields ───────────

console.log('\n5-6. Legacy records — Math.max safety net');
{
  const local = { id: 'u1', tokens: 180, staked: 50 };   // no _syncTs
  const cloud = { id: 'u1', tokens: 100, staked: 30 };   // no _syncTs

  const { merged } = mergeAccount(local, cloud);
  assert(merged.tokens === 180, '5. legacy: higher local tokens preserved');
  assert(merged.staked === 50,  '6. legacy: higher local staked preserved');
}

// ── 7. Legacy: cloud-only fields still applied ───────────────────────────────

console.log('\n7. Legacy: cloud-only fields populated into result');
{
  const local = { id: 'u1', tokens: 50 };
  const cloud = { id: 'u1', tokens: 40, name: 'Alice Updated', org: 'NewOrg' };

  const { merged } = mergeAccount(local, cloud);
  assert(merged.tokens === 50,          '7a. higher local tokens preserved');
  assert(merged.name  === 'Alice Updated', '7b. cloud name applied');
  assert(merged.org   === 'NewOrg',        '7c. cloud org applied');
}

// ── 8-9. Re-push behaviour ────────────────────────────────────────────────────

console.log('\n8-9. Re-push triggered only when local is newer');
{
  const { repushed: repush8 } = mergeAccount(
    { id: 'u1', tokens: 150, _syncTs: 2000 },
    { id: 'u1', tokens: 100, _syncTs: 1000 }
  );
  assert(repush8 === true, '8. re-push when local newer');

  const { repushed: repush9 } = mergeAccount(
    { id: 'u1', tokens: 100, _syncTs: 1000 },
    { id: 'u1', tokens: 200, _syncTs: 2000 }
  );
  assert(repush9 === false, '9. no re-push when cloud newer');
}

// ── 10-11. Non-financial fields follow the winning side ───────────────────────

console.log('\n10-11. Non-financial fields follow the winning side');
{
  // Cloud wins path
  const { merged: m10 } = mergeAccount(
    { id: 'u1', tokens: 100, name: 'Old Name', _syncTs: 1000 },
    { id: 'u1', tokens: 200, name: 'New Name', _syncTs: 2000 }
  );
  assert(m10.name === 'New Name', '10. cloud-wins: cloud name applied');

  // Local wins path
  const { merged: m11 } = mergeAccount(
    { id: 'u1', tokens: 150, name: 'Local Name', _syncTs: 2000 },
    { id: 'u1', tokens: 100, name: 'Cloud Name', _syncTs: 1000 }
  );
  assert(m11.name === 'Local Name', '11. local-wins: local name preserved');
}

// ── 12. Local newer: cloud-only fields still populated ───────────────────────

console.log('\n12. Local newer: cloud-only fields still populated');
{
  const { merged } = mergeAccount(
    { id: 'u1', tokens: 150, _syncTs: 2000 },
    { id: 'u1', tokens: 100, _syncTs: 1000, cloudOnlyField: 'present' }
  );
  assert(merged.tokens           === 150,       '12a. local tokens preserved');
  assert(merged.cloudOnlyField   === 'present', '12b. cloud-only field still populated');
}

// ── 13. Empty local → cloud wins entirely ────────────────────────────────────

console.log('\n13. Empty local account: cloud wins');
{
  const { merged } = mergeAccount(null, { id: 'u1', tokens: 200, _syncTs: 1000 });
  assert(merged.tokens === 200, 'cloud tokens applied when local is empty');
}

// ── 14. No cloud account → no merge, local returned ──────────────────────────

console.log('\n14. No cloud account: local preserved unchanged');
{
  const local = { id: 'u1', tokens: 150, _syncTs: 2000 };
  const { merged } = mergeAccount(local, null);
  assert(merged.tokens === 150, 'local tokens unchanged when no cloud account');
}

// ── 15. _syncTs preserved in merged result ────────────────────────────────────

console.log('\n15. _syncTs preserved in merged result');
{
  const { merged } = mergeAccount(
    { id: 'u1', tokens: 150, _syncTs: 2000 },
    { id: 'u1', tokens: 100, _syncTs: 1000 }
  );
  assert(typeof merged._syncTs === 'number' && merged._syncTs > 0,
    '_syncTs is a positive number in merged result');
}

// ── 16. Regression: offline token earn survives reconnect ─────────────────────

console.log('\n16. Regression: offline token earn survives reconnect hydration');
{
  // Device B offline state: started at 100, earned 50 tokens → 150
  const deviceBLocal = { id: 'u1', tokens: 150, _syncTs: 5000 };

  // Appwrite (Device A's last sync): still 100
  const appwrite = { id: 'u1', tokens: 100, _syncTs: 1000 };

  const { merged } = mergeAccount(deviceBLocal, appwrite);
  assert(merged.tokens === 150, '[regression] offline-earned tokens (150) survive reconnect');
}

// ── 17. Multi-device divergence resolved by timestamp ────────────────────────

console.log('\n17. Multi-device divergence resolved by timestamp');
{
  // Device A: spent 100 tokens, sync at ts=3000 → cloud=50
  const deviceA_cloud = { id: 'u1', tokens: 50,  _syncTs: 3000 };

  // Device B: independently spent 20 tokens, last local write at ts=2000 → local=80
  const deviceB_local = { id: 'u1', tokens: 80,  _syncTs: 2000 };

  // Device A's cloud is newer (3000 > 2000) → cloud wins
  const { merged } = mergeAccount(deviceB_local, deviceA_cloud);
  assert(merged.tokens === 50,
    'newer cloud state (Device A) wins over older local state (Device B)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
