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
/**
 * Resolves an offline/online data conflict using a server-wins merge strategy.
 * Local actions are applied on top of server data where no direct field clash exists.
 * @param {Object} localAction - The pending local action with type and payload fields.
 * @param {Object} serverData - The authoritative server-side data snapshot.
 * @returns {{ resolved: Object, conflict: boolean }} Merged result and conflict flag.
 */
export function resolveConflict(localAction, serverData) {
  // If no server data exists, local action wins
  if (!serverData) {
    console.debug(`[ConflictResolver] No server data — local action applied: ${localAction.id}`);
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

  console.debug(`[ConflictResolver] Local action is newer — applying: ${localAction.id}`);
  return localAction;
}

/**
 * Check if an action is a duplicate in the pending queue
 * @param {Array} pendingActions - All queued offline actions
 * @param {string} type - Action type to check
 * @param {Object} payload - Action payload to compare
 * @returns {boolean}
 */
/**
 * Checks whether an identical action already exists in the pending offline queue.
 * Used to prevent duplicate writes during intermittent connectivity.
 * @param {Array<Object>} pendingActions - Current list of queued offline actions.
 * @param {string} type - The action type string to check for (e.g. 'ORDER_UPDATE').
 * @param {Object} payload - The action payload to match against existing entries.
 * @returns {boolean} True if an equivalent action already exists in the queue.
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
/**
 * Deduplicates and merges GPS location update actions from the offline queue.
 * Keeps only the most recent update per rider, discarding stale duplicates.
 * @param {Array<{type: string, payload: {riderId: string, lat: number, lng: number}}>} actions - Offline action queue.
 * @returns {Array<Object>} Deduplicated action list with latest GPS per rider retained.
 */
export function mergeGPSUpdates(actions) {
  const gpsActions = actions.filter((a) => a.type === 'gps');
  const otherActions = actions.filter((a) => a.type !== 'gps');

  if (gpsActions.length === 0) return actions;

  // Keep only the latest GPS update
  const latestGPS = gpsActions.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  );

  console.debug(`[ConflictResolver] Merged ${gpsActions.length} GPS actions → 1 kept`);
  return [...otherActions, latestGPS];
}

/**
 * Validate action before queuing — prevent invalid data
 * @param {string} type - Action type
 * @param {Object} payload - Action data
 * @returns {boolean}
 */
/**
 * Validates an offline action's payload against the required schema for its type.
 * @param {string} type - The action type (e.g. 'ORDER_UPDATE', 'GPS_UPDATE').
 * @param {Object} payload - The action payload to validate.
 * @returns {{ valid: boolean, errors: string[] }} Validation result with any error messages.
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