/**
 * @fileoverview Conflict Resolution System for ReGenX Offline Sync
 * Handles duplicate detection, stale data prevention, and multi-device conflicts
 */

/**
 * Resolve conflicts between offline and server data
 * Uses timestamp-based "last write wins" strategy with UUID validation
 * @param {Object} localAction - Action stored offline
 * @param {Object} serverData - Current server state
 * @returns {Object} - Resolved action to apply
 */
export function resolveConflict(localAction, serverData) {
  // If no server data exists, local action wins
  if (!serverData) {
    console.log(`[ConflictResolver] No server data — local action applied: ${localAction.id}`);
    return localAction;
  }

  // UUID duplicate check — if same ID already on server, skip
  if (serverData.id === localAction.id) {
    console.warn(`[ConflictResolver] Duplicate detected — skipping: ${localAction.id}`);
    return null;
  }

  // Timestamp check — newer data wins
  if (serverData.timestamp > localAction.timestamp) {
    console.warn(`[ConflictResolver] Server data is newer — discarding local: ${localAction.id}`);
    return null;
  }

  console.log(`[ConflictResolver] Local action is newer — applying: ${localAction.id}`);
  return localAction;
}

/**
 * Check if an action is a duplicate in the pending queue
 * @param {Array} pendingActions - All queued offline actions
 * @param {string} type - Action type to check
 * @param {Object} payload - Action payload to compare
 * @returns {boolean}
 */
export function isDuplicate(pendingActions, type, payload) {
  return pendingActions.some(
    (action) =>
      action.type === type &&
      JSON.stringify(action.payload) === JSON.stringify(payload)
  );
}

/**
 * Merge offline GPS updates — keep only the latest location
 * @param {Array} actions - All pending GPS actions
 * @returns {Array} - Deduplicated actions (latest GPS only)
 */
export function mergeGPSUpdates(actions) {
  const gpsActions = actions.filter((a) => a.type === 'gps');
  const otherActions = actions.filter((a) => a.type !== 'gps');

  if (gpsActions.length === 0) return actions;

  // Keep only the latest GPS update
  const latestGPS = gpsActions.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  );

  console.log(`[ConflictResolver] Merged ${gpsActions.length} GPS actions → 1 kept`);
  return [...otherActions, latestGPS];
}

/**
 * Validate action before queuing — prevent invalid data
 * @param {string} type - Action type
 * @param {Object} payload - Action data
 * @returns {boolean}
 */
export function validateAction(type, payload) {
  const validTypes = ['dispatch', 'pickup', 'gps', 'scan', 'reward', 'plant'];

  if (!validTypes.includes(type)) {
    console.error(`[ConflictResolver] Invalid action type: ${type}`);
    return false;
  }

  if (!payload || typeof payload !== 'object') {
    console.error(`[ConflictResolver] Invalid payload for: ${type}`);
    return false;
  }

  return true;
}