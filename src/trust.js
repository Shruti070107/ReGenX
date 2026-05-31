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
     * Generates a deterministic SHA-256 hash over the canonical fields of a
     * ledger entry.  Keys are extracted in a fixed order so the resulting
     * JSON string — and therefore the hash — is stable regardless of how
     * the input object was constructed.  The canonical field set matches
     * buildTrustLedgerPayload in app.js.
     *
     * @param {Object} entry - Ledger entry or canonical payload object.
     * @param {string} [previousHash='GENESIS'] - Hash of the preceding entry.
     * @returns {Promise<string>} Hex-encoded SHA-256 digest prefixed with "0x".
     */
    generateLedgerHash: async (entry, previousHash = 'GENESIS') => {
        const ph = typeof previousHash === 'string' && previousHash ? previousHash : 'GENESIS';
        // Fixed key order ensures JSON.stringify is deterministic across
        // engines and independent of input property insertion order.
        const canonical = {
            previousHash: ph,
            orderId:   typeof entry?.orderId   === 'string' ? entry.orderId   : String(entry?.orderId   ?? ''),
            event:     typeof entry?.event     === 'string' ? entry.event     : String(entry?.event     ?? ''),
            ts:        Number.isFinite(entry?.ts)           ? entry.ts        : 0,
            actorRole: typeof entry?.actorRole === 'string' ? entry.actorRole : String(entry?.actorRole ?? ''),
            actorId:   typeof entry?.actorId   === 'string' ? entry.actorId   : String(entry?.actorId   ?? ''),
            lat:       Number.isFinite(entry?.lat)          ? entry.lat       : null,
            lng:       Number.isFinite(entry?.lng)          ? entry.lng       : null
        };
        const encoded   = new TextEncoder().encode(JSON.stringify(canonical));
        const hashBuf   = await crypto.subtle.digest('SHA-256', encoded);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Synchronously verifies the integrity of the trust ledger by walking the
     * hash chain.  For each entry it checks:
     *   - the entry carries a non-empty hash string
     *   - the first entry anchors to 'GENESIS'
     *   - every subsequent entry's previousHash equals its predecessor's hash
     *
     * This detects inserted, deleted, or reordered entries and any chain
     * modification that was not propagated forward through the chain.
     *
     * Full content-hash recomputation (which is async) is handled separately
     * by prepareTrustLedgerForWrite before each write.
     *
     * @param {Array<Object>} ledger - Ordered array of sealed ledger entries.
     * @returns {{ valid: boolean, tampered: boolean, brokenIndex: number|null }}
     */
    verifyLedgerIntegrity: (ledger) => {
        if (!Array.isArray(ledger) || ledger.length === 0) {
            return { valid: true, tampered: false, brokenIndex: null };
        }

        // First entry must anchor to the genesis sentinel.
        if (ledger[0].previousHash !== 'GENESIS') {
            return { valid: false, tampered: true, brokenIndex: 0 };
        }

        for (let i = 0; i < ledger.length; i++) {
            const entry = ledger[i];

            // Every sealed entry must carry a non-empty hash.
            if (!entry.hash || typeof entry.hash !== 'string') {
                return { valid: false, tampered: true, brokenIndex: i };
            }

            // Each entry (beyond the first) must reference its predecessor.
            if (i > 0 && entry.previousHash !== ledger[i - 1].hash) {
                return { valid: false, tampered: true, brokenIndex: i };
            }
        }

        return { valid: true, tampered: false, brokenIndex: null };
    }
};

// Phase 2 Task 2: Cryptographic ledger hash chain implemented.
