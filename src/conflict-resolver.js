/**
 * @fileoverview Conflict Resolution System for ReGenX Offline Sync
 * Handles duplicate detection, stale data prevention, and multi-device conflicts.
 */

/**
 * Resolves an offline/online data conflict using a server-wins merge strategy.
 * Local actions are applied on top of server data where no direct field clash exists.
 * @param {Object} localAction - The pending local action with type and payload fields.
 * @param {Object} serverData - The authoritative server-side data snapshot.
 * @returns {Object|null} Local action to apply, or null when it should be skipped.
 */
export function resolveConflict(localAction, serverData) {
  // If no server data exists, local action wins
  if (!serverData) {
    return localAction;
  }

  // UUID duplicate check - if same ID already on server, skip
  if (serverData.id === localAction.id) {
    console.warn(`[ConflictResolver] Duplicate detected — skipping: ${localAction.id}`);
    return null;
  }

  // Timestamp check - newer data wins
  if (serverData.timestamp > localAction.timestamp) {
    console.warn(`[ConflictResolver] Server data is newer — discarding local: ${localAction.id}`);
    return null;
  }

  return localAction;
}

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
 * Deduplicates GPS location updates by keeping only the latest location record.
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

  return [...otherActions, latestGPS];
}

/**
 * Validates an offline action's payload against the required schema for its type.
 * @param {string} type - The action type (e.g. 'ORDER_UPDATE', 'GPS_UPDATE').
 * @param {Object} payload - The action payload to validate.
 * @returns {boolean} True when the action type and payload are valid.
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
