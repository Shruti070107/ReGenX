/**
 * @fileoverview ReGenX Trust Protocol Module
 * Handles decentralized identity (DID), trust scoring, and reward scaling.
 * Phase 2 Upgrade: Enhanced SHA-256 trust ledger security validations.
 * @author GSSoC Contributor
 */

export const TrustProtocol = {
    /** @enum {string} */
    RANKS: {
        BRONZE: 'Bronze',
        SILVER: 'Silver',
        GOLD: 'Gold',
        DIAMOND: 'Diamond'
    },

    /**
     * Calculates the trust score based on user activity.
     * @param {Object} account - The user account object.
     * @param {Array} history - The user's order history.
     * @returns {number} Score from 0 to 100.
     */
    calculateScore: (account, history) => {
        if (!history || history.length === 0) return 50; // Base score for new users

        let score = 60; // Standard starting score for active users
        
        // 1. Completion Rate (Impact: High)
        const completed = history.filter(o => o.status === 'completed').length;
        const completionRate = completed / history.length;
        score += (completionRate * 30); // Max +30 points

        // 2. Accuracy Bonus (Impact: Med)
        // If scanned weight matches actual weight within 5%
        const accurateOrders = history.filter(o => {
            if (!o.actualKg || !o.kg) return false;
            const diff = Math.abs(o.actualKg - o.kg) / o.kg;
            return diff <= 0.05;
        }).length;
        score += (accurateOrders / Math.max(history.length, 1)) * 10; // Max +10 points

        return Math.min(Math.round(score), 100);
    },

    /**
     * Determines the rank name and visual properties based on score.
     * @param {number} score - The user's current trust score.
     * @returns {Object}
     */
    getRankDetails: (score) => {
        if (score >= 90) return { name: TrustProtocol.RANKS.DIAMOND, color: '#3B82F6', multiplier: 1.5, icon: '💎' };
        if (score >= 75) return { name: TrustProtocol.RANKS.GOLD, color: '#F59E0B', multiplier: 1.25, icon: '🏆' };
        if (score >= 60) return { name: TrustProtocol.RANKS.SILVER, color: '#94A3B8', multiplier: 1.1, icon: '🥈' };
        return { name: TrustProtocol.RANKS.BRONZE, color: '#B45309', multiplier: 1.0, icon: '🥉' };
    },

    /**
     * Gets the dynamic reward for a completed order based on trust.
     * @param {number} baseAmount - The base reward amount.
     * @param {number} score 
     * @returns {number}
     */
    calculateReward: (baseAmount, score) => {
        const { multiplier } = TrustProtocol.getRankDetails(score);
        return Math.round(baseAmount * multiplier);
    },

    /**
     * Calculates deviation in kilometers from a straight route line.
     * @param {{lat:number,lng:number}} start - Route start coordinates.
     * @param {{lat:number,lng:number}} end - Route end coordinates.
     * @param {{lat:number,lng:number}} point - Event coordinates.
     * @param {(lat1:number,lng1:number,lat2:number,lng2:number)=>number} distanceFn - Distance function.
     * @returns {number} Deviation in km.
     */
    calculateRouteDeviationKm: (start, end, point, distanceFn) => {
        if (!start || !end || !point || !distanceFn) return 0;
        const a = distanceFn(start.lat, start.lng, point.lat, point.lng);
        const b = distanceFn(point.lat, point.lng, end.lat, end.lng);
        const c = distanceFn(start.lat, start.lng, end.lat, end.lng);
        if (!c) return 0;
        const s = (a + b + c) / 2;
        const area = Math.max(s * (s - a) * (s - b) * (s - c), 0);
        const height = (2 * Math.sqrt(area)) / c;
        return Number.isFinite(height) ? height : 0;
    },

    /**
     * Analyzes integrity events for anomalies.
     * @param {Array<Object>} events - Ledger events for an order.
     * @param {{start?:{lat:number,lng:number}, end?:{lat:number,lng:number}}} route - Route endpoints.
     * @param {(lat1:number,lng1:number,lat2:number,lng2:number)=>number} distanceFn - Distance function.
     * @returns {{maxGapMins:number,maxDeviationKm:number,anomalies:{timeGap:boolean,routeDeviation:boolean}}}
     */
    analyzeIntegrity: (events, route, distanceFn) => {
        if (!events || events.length === 0) {
            return { maxGapMins: 0, maxDeviationKm: 0, anomalies: { timeGap: false, routeDeviation: false } };
        }

        const sorted = [...events].sort((a, b) => a.ts - b.ts);
        let maxGapMins = 0;
        for (let i = 1; i < sorted.length; i++) {
            const gap = (sorted[i].ts - sorted[i - 1].ts) / 60000;
            if (gap > maxGapMins) maxGapMins = gap;
        }

        let maxDeviationKm = 0;
        if (route && route.start && route.end && distanceFn) {
            sorted.forEach(e => {
                if (typeof e.lat !== 'number' || typeof e.lng !== 'number') return;
                const dev = TrustProtocol.calculateRouteDeviationKm(route.start, route.end, { lat: e.lat, lng: e.lng }, distanceFn);
                if (dev > maxDeviationKm) maxDeviationKm = dev;
            });
        }

        return {
            maxGapMins,
            maxDeviationKm,
            anomalies: {
                timeGap: maxGapMins > 45,
                routeDeviation: maxDeviationKm > 1.5
            }
        };
    },

    /**
     * Calculates a trust integrity score from ledger events.
     * @param {Array<Object>} events - Ledger events for an order.
     * @param {{start?:{lat:number,lng:number}, end?:{lat:number,lng:number}}} route - Route endpoints.
     * @param {(lat1:number,lng1:number,lat2:number,lng2:number)=>number} distanceFn - Distance function.
     * @returns {{score:number, maxGapMins:number, maxDeviationKm:number, anomalies:{timeGap:boolean,routeDeviation:boolean}}}
     */
    calculateIntegrityScore: (events, route, distanceFn) => {
        const analysis = TrustProtocol.analyzeIntegrity(events, route, distanceFn);
        let score = 100;
        if (!events || events.length < 2) score -= 10;
        if (analysis.anomalies.timeGap) score -= 25;
        if (analysis.anomalies.routeDeviation) score -= 25;
        if (!analysis.anomalies.routeDeviation && analysis.maxDeviationKm > 0.7) score -= 10;
        score = Math.max(0, Math.min(100, Math.round(score)));
        return { score, ...analysis };
    },

    /**
     * Generates a deterministic SHA-256 hash for a trust ledger entry.
     *
     * Only the eight canonical fields that define the record's identity are
     * included in the digest, serialised in fixed alphabetical key order so
     * the result is stable regardless of how the caller constructed the
     * object or the JavaScript engine's property-insertion order.
     *
     * @param {Object} entry - Ledger entry (full or canonical payload).
     * @param {string} [previousHash='GENESIS'] - Hash of the immediately preceding entry.
     * @returns {Promise<string>} '0x'-prefixed 64-character lowercase hex SHA-256 digest.
     */
    generateLedgerHash: async (entry, previousHash) => {
        // Resolve the previousHash: prefer the explicit argument, then the
        // field embedded in the entry object, then the GENESIS sentinel.
        const prevHash =
            (typeof previousHash === 'string' && previousHash !== '')
                ? previousHash
                : (typeof entry?.previousHash === 'string' && entry.previousHash !== '')
                    ? entry.previousHash
                    : 'GENESIS';

        // Canonical fields, normalised to stable types.  The explicit key
        // array passed to JSON.stringify guarantees the serialisation order
        // is independent of insertion order.
        const CANON_KEYS = ['actorId', 'actorRole', 'event', 'lat', 'lng', 'orderId', 'previousHash', 'ts'];
        const canonical = {
            actorId:      typeof entry?.actorId   === 'string' ? entry.actorId   : String(entry?.actorId   ?? ''),
            actorRole:    typeof entry?.actorRole  === 'string' ? entry.actorRole : String(entry?.actorRole ?? ''),
            event:        typeof entry?.event      === 'string' ? entry.event     : String(entry?.event     ?? ''),
            lat:          Number.isFinite(entry?.lat)           ? entry.lat       : null,
            lng:          Number.isFinite(entry?.lng)           ? entry.lng       : null,
            orderId:      typeof entry?.orderId    === 'string' ? entry.orderId   : String(entry?.orderId   ?? ''),
            previousHash: prevHash,
            ts:           Number.isFinite(entry?.ts)            ? entry.ts        : 0,
        };

        const serialized = JSON.stringify(canonical, CANON_KEYS);
        const encoded    = new TextEncoder().encode(serialized);
        const hashBuf    = await crypto.subtle.digest('SHA-256', encoded);
        const hex        = Array.from(new Uint8Array(hashBuf), b => b.toString(16).padStart(2, '0')).join('');
        return '0x' + hex;
    },

    /**
     * Synchronously validates the structural integrity of a trust ledger by
     * verifying that the hash chain is unbroken.
     *
     * Rules checked:
     *  - Every entry must be a non-null object with non-empty `hash` and
     *    `previousHash` string fields.
     *  - The first entry must be anchored to the 'GENESIS' sentinel.
     *  - Every subsequent entry's `previousHash` must equal the stored hash
     *    of the immediately preceding entry.
     *
     * This is a structural check only; it does not recompute cryptographic
     * hashes from canonical fields.  Full hash re-verification is performed
     * by the async integrity-scan path in the UI.
     *
     * @param {Array<Object>} ledger - Ordered array of sealed ledger entries.
     * @returns {{ valid: boolean, tampered: boolean, brokenIndex: number|null }}
     */
    verifyLedgerIntegrity: (ledger) => {
        if (!Array.isArray(ledger) || ledger.length === 0) {
            return { valid: true, tampered: false, brokenIndex: null };
        }

        for (let i = 0; i < ledger.length; i++) {
            const entry = ledger[i];

            if (!entry || typeof entry !== 'object') {
                return { valid: false, tampered: true, brokenIndex: i };
            }

            // Both hash fields must be present and non-empty for chain validation.
            if (typeof entry.hash !== 'string' || entry.hash === '') {
                return { valid: false, tampered: true, brokenIndex: i };
            }
            if (typeof entry.previousHash !== 'string' || entry.previousHash === '') {
                return { valid: false, tampered: true, brokenIndex: i };
            }

            if (i === 0) {
                // The first entry must be anchored to the GENESIS sentinel.
                if (entry.previousHash !== 'GENESIS') {
                    return { valid: false, tampered: true, brokenIndex: 0 };
                }
            } else {
                // Every subsequent entry's previousHash must reference the
                // stored hash of the immediately preceding entry.
                if (entry.previousHash !== ledger[i - 1].hash) {
                    return { valid: false, tampered: true, brokenIndex: i };
                }
            }
        }

        return { valid: true, tampered: false, brokenIndex: null };
    },
};

// Phase 2 Task 2: Active cryptographic ledger signatures active
