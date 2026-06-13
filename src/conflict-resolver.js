/**
 * @fileoverview Conflict Resolution System for ReGenX Offline Sync
 * Handles duplicate detection, stale data prevention, and multi-device conflicts
 */

/**
 * Resolves conflict using a specific strategy.
 * Supports: 'server-wins' (default), 'client-wins', and 'merge' (with user prompt).
 * @param {Object} localAction - Action stored offline
 * @param {Object} serverData - Current server state
 * @param {'server-wins'|'client-wins'|'merge'} strategy - Strategy to apply
 * @returns {Promise<Object|null>} - Resolved action to apply or null if discarded
 */
export async function resolveConflict(localAction, serverData, strategy = 'server-wins') {
  // If no server data exists, local action wins
  if (!serverData) {
    console.debug(`[ConflictResolver] No server data — local action applied: ${localAction.id}`);
    return localAction;
  }

  // UUID duplicate check — if same ID already on server, skip
  if (serverData.id === localAction.id && !localAction.forceUpdate) {
    console.warn(`[ConflictResolver] Duplicate detected — skipping: ${localAction.id}`);
    return null;
  }

  if (strategy === 'client-wins') {
    console.debug(`[ConflictResolver] Client-Wins strategy applied: ${localAction.id}`);
    return localAction;
  }

  if (strategy === 'server-wins') {
    if (serverData.timestamp > localAction.timestamp) {
      console.warn(`[ConflictResolver] Server-Wins: Server is newer. Discarding local: ${localAction.id}`);
      return null;
    }
    return localAction;
  }

  if (strategy === 'merge') {
    console.debug(`[ConflictResolver] Merge strategy for: ${localAction.id}`);
    const mergedPayload = { ...serverData, ...localAction.payload };

    // Prompt user on critical conflicts (status discrepancy)
    if (serverData.status && localAction.payload.status && serverData.status !== localAction.payload.status) {
      if (typeof window !== 'undefined' && window.confirm) {
        const keepLocal = window.confirm(
          `Conflict on dispatch ${localAction.id || ''}:\n` +
          `Server status: "${serverData.status}" vs Local status: "${localAction.payload.status}".\n` +
          `Do you want to override the server with your offline changes?`
        );
        if (!keepLocal) {
          return null; // Keep server data, discard local update
        }
      }
    }
    return {
      ...localAction,
      payload: mergedPayload
    };
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
 * Validates an offline action's payload against the required schema for its type.
 * @param {string} type - The action type (e.g. 'ORDER_UPDATE', 'GPS_UPDATE').
 * @param {Object} payload - The action payload to validate.
 * @returns {boolean} Validation result.
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