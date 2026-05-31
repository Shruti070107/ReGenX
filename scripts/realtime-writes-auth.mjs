/**
 * @fileoverview Server-authoritative write-authorization rules for the
 * ReGenX realtime server.
 *
 * Every state key written through operational:event is checked against the
 * per-socket session established at session:join time.  Writes that do not
 * match an explicit allow rule are rejected before reaching the state store.
 *
 * Namespace rules summary:
 *
 *   regenx-v3:acc:{id}      own account: any role whose sessionId matches.
 *                           cross-account: plant role only (token-reward flow).
 *   regenx-v3:ord:{id}      multi-party record; any valid role may write.
 *   regenx-v3:iot-bins*     provider or plant role only.
 *   SHARED_WRITABLE_KEYS    aggregate ledgers / shared counters; any valid role.
 *   spend-log:*             per-account debit log; any valid role.
 *   smart-alerts:*          per-account alert prefs; any valid role.
 *   anything else           denied.
 *
 * Valid roles are provider, rider, and plant.  The 'admin' string is
 * intentionally absent — it is a server-side broadcast destination only.
 */

/** Application key prefix used by all ReGenX localStorage entries. */
export const STORAGE_PREFIX = 'regenx-v3:';

/** Client roles that may perform state writes. */
export const VALID_ROLES = new Set(['provider', 'rider', 'plant']);

/**
 * Shared aggregate keys that any authenticated socket with a valid role
 * may read and write.  These records have no single owner.
 */
export const SHARED_WRITABLE_KEYS = new Set([
  STORAGE_PREFIX + 'trust-ledger',
  STORAGE_PREFIX + 'esg-alerts',
  STORAGE_PREFIX + 'credit-ledger',
  STORAGE_PREFIX + 'sla-ledger',
  STORAGE_PREFIX + 'energy-ledger',
  STORAGE_PREFIX + 'sensor-ledger',
  STORAGE_PREFIX + 'emissions-ledger',
  STORAGE_PREFIX + 'quality-ledger',
  STORAGE_PREFIX + 'automation-pipeline',
  STORAGE_PREFIX + 'audit-registry',
  STORAGE_PREFIX + 'global-fund',
  STORAGE_PREFIX + 'notifications',
  STORAGE_PREFIX + 'active-session',
]);

/**
 * Determines whether the supplied session is authorized to write to key.
 *
 * The session object is the value stored server-side at session:join time
 * and is never derived from the same operational:event payload being
 * evaluated, so it cannot be spoofed within a single request.
 *
 * @param {{ role: string|null, sessionId: string|null }|undefined} session
 * @param {string} key - Full storage key (must start with STORAGE_PREFIX).
 * @returns {boolean}
 */
export function isWriteAuthorized(session, key) {
  // Basic shape validation
  if (!key || typeof key !== 'string') return false;

  // All writable keys must belong to the application namespace
  if (!key.startsWith(STORAGE_PREFIX)) return false;

  // A session:join must have been performed before any writes are accepted
  if (!session) return false;

  const { role, sessionId } = session;

  // Unknown or elevated roles may not write anything
  if (!VALID_ROLES.has(role)) return false;

  // ── Shared aggregate keys ───────────────────────────────────────────────
  if (SHARED_WRITABLE_KEYS.has(key)) return true;

  // ── Account records: regenx-v3:acc:{accountId} ─────────────────────────
  const accPrefix = STORAGE_PREFIX + 'acc:';
  if (key.startsWith(accPrefix)) {
    const accountId = key.slice(accPrefix.length);
    // A socket may always write to its own account record
    if (sessionId && sessionId === accountId) return true;
    // Plant operators write to the provider's account during order confirmation
    // to credit the token reward.  This is the only legitimate cross-account
    // write in the application.
    if (role === 'plant') return true;
    return false;
  }

  // ── Order records: regenx-v3:ord:{orderId} ──────────────────────────────
  // Orders are multi-party records.  Providers create them, riders accept
  // and progress them, and plants confirm delivery.  All three roles may
  // write to order documents.
  if (key.startsWith(STORAGE_PREFIX + 'ord:')) return true;

  // ── IoT bin data: regenx-v3:iot-bins* ───────────────────────────────────
  if (key.startsWith(STORAGE_PREFIX + 'iot-bins')) {
    return role === 'provider' || role === 'plant';
  }

  // ── Per-account auxiliary keys ───────────────────────────────────────────
  // spend-log:*    — debit log written by all roles
  // smart-alerts:* — notification preferences per account
  if (key.startsWith(STORAGE_PREFIX + 'spend-log:') ||
      key.startsWith(STORAGE_PREFIX + 'smart-alerts:')) {
    return true;
  }

  // Default: reject any key that does not match a known namespace
  return false;
}
