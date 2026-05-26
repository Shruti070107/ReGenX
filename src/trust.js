/**
 * @fileoverview ReGenX Trust Protocol Module
 * Handles decentralized identity (DID), trust scoring, and reward scaling.
 * Phase 2 Upgrade: Enhanced SHA-256 trust ledger security validations.
 * @author GSSoC Contributor
 */

const ledgerTextEncoder = new TextEncoder();

function normalizeLedgerNumber(value) {
    return Number.isFinite(value) ? value : null;
}

function normalizeLedgerString(value) {
    return typeof value === 'string' ? value : String(value ?? '');
}

function normalizeLedgerHash(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim().toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(trimmed)) return '';
    return trimmed;
}

function getWebCryptoSubtle() {
    const subtle = globalThis?.crypto?.subtle;
    if (!subtle || typeof subtle.digest !== 'function') {
        throw new Error('WebCrypto SubtleCrypto SHA-256 is unavailable.');
    }
    return subtle;
}

/**
 * Canonicalize a ledger entry into deterministic hash fields.
 * @param {Object} entry - Ledger entry candidate.
 * @param {string} previousHash - Previous hash expected for this position.
 * @returns {{previousHash:string,orderId:string,event:string,ts:(number|null),actorRole:string,actorId:string,lat:(number|null),lng:(number|null)}}
 */
function canonicalizeLedgerEntry(entry, previousHash = 'GENESIS') {
    return {
        previousHash: normalizeLedgerString(previousHash || 'GENESIS'),
        orderId: normalizeLedgerString(entry?.orderId),
        event: normalizeLedgerString(entry?.event),
        ts: normalizeLedgerNumber(entry?.ts),
        actorRole: normalizeLedgerString(entry?.actorRole),
        actorId: normalizeLedgerString(entry?.actorId),
        lat: normalizeLedgerNumber(entry?.lat),
        lng: normalizeLedgerNumber(entry?.lng)
    };
}

/**
 * Serialize canonical ledger fields into a deterministic payload string.
 * @param {Object} entry - Ledger entry candidate.
 * @param {string} previousHash - Previous hash expected for this position.
 * @returns {string} Canonical JSON payload.
 */
function serializeLedgerPayload(entry, previousHash = 'GENESIS') {
    return JSON.stringify(canonicalizeLedgerEntry(entry, previousHash));
}

/**
 * Compute SHA-256 hash for a canonical payload string.
 * @param {string} payload - Canonical ledger payload.
 * @returns {Promise<string>} 0x-prefixed lowercase SHA-256 hex.
 */
async function computeLedgerHash(payload) {
    const subtle = getWebCryptoSubtle();
    const digest = await subtle.digest('SHA-256', ledgerTextEncoder.encode(payload));
    return `0x${Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')}`;
}

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
     * @param {number} score - The user's current trust score 
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
     * @param {number} baseAmount - The base reward amount 
     * @param {number} score 
     * @returns {number}
     */
    calculateReward: (baseAmount, score) => {
        const { multiplier } = TrustProtocol.getRankDetails(score);
        return Math.round(baseAmount * multiplier);
    },

    /**
     * Generates a deterministic trust ledger hash from the previous hash and event payload.
     * @param {Object} entry - Ledger event payload.
     * @param {string} previousHash - Previous entry hash in the chain.
     * @returns {Promise<string>} SHA-256 hash with 0x prefix.
     */
    canonicalizeLedgerEntry,

    serializeLedgerPayload,

    computeLedgerHash,

    generateLedgerHash: async (entry, previousHash = 'GENESIS') => {
        const payload = serializeLedgerPayload(entry, previousHash);
        return computeLedgerHash(payload);
    },

    /**
     * Verifies trust ledger chain continuity and hash integrity.
     * @param {Array<Object>} events - Trust ledger entries in storage order.
     * @returns {Promise<{valid:boolean,tampered:boolean,brokenIndex:(number|null)}>} Integrity result.
     */
    verifyLedgerIntegrity: async (events) => {
        if (!Array.isArray(events) || events.length === 0) {
            return { valid: true, tampered: false, brokenIndex: null };
        }

        let previousHash = 'GENESIS';

        for (let index = 0; index < events.length; index++) {
            const rawEntry = events[index] || {};
            const hasPreviousHash = typeof rawEntry.previousHash === 'string' && rawEntry.previousHash.length > 0;
            const storedHash = normalizeLedgerHash(rawEntry.hash);
            const isV2Entry = rawEntry._v === 2;

            if (index === 0) {
                if (hasPreviousHash && rawEntry.previousHash !== 'GENESIS') {
                    return { valid: false, tampered: true, brokenIndex: index };
                }
            } else if (hasPreviousHash && rawEntry.previousHash !== previousHash) {
                return { valid: false, tampered: true, brokenIndex: index };
            }

            const canonical = canonicalizeLedgerEntry(rawEntry, previousHash);

            if (!canonical.orderId || !canonical.event || !Number.isFinite(canonical.ts) || !canonical.actorRole || !canonical.actorId) {
                return { valid: false, tampered: true, brokenIndex: index };
            }

            let expectedHash = '';
            try {
                expectedHash = await computeLedgerHash(serializeLedgerPayload(canonical, previousHash));
            } catch {
                return { valid: false, tampered: true, brokenIndex: index };
            }

            if (isV2Entry) {
                if (!storedHash || rawEntry.previousHash !== previousHash || storedHash !== expectedHash) {
                    return { valid: false, tampered: true, brokenIndex: index };
                }
                if (rawEntry.sealed !== true || rawEntry.verified !== true) {
                    return { valid: false, tampered: true, brokenIndex: index };
                }
            } else if (storedHash && storedHash !== expectedHash) {
                return { valid: false, tampered: true, brokenIndex: index };
            }

            previousHash = storedHash || expectedHash;
        }

        return { valid: true, tampered: false, brokenIndex: null };
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
     * @returns {{score:number, maxGapMins:number, maxDeviationKm:number, anomalies:{timeGap:boolean,routeDeviation:boolean}, tampered:boolean, brokenIndex:(number|null)}}
     */
    calculateIntegrityScore: (events, route, distanceFn) => {
        const analysis = TrustProtocol.analyzeIntegrity(events, route, distanceFn);

        let score = 100;
        if (!events || events.length < 2) score -= 10;
        if (analysis.anomalies.timeGap) score -= 25;
        if (analysis.anomalies.routeDeviation) score -= 25;
        if (!analysis.anomalies.routeDeviation && analysis.maxDeviationKm > 0.7) score -= 10;
        score = Math.max(0, Math.min(100, Math.round(score)));
        return { score, ...analysis, tampered: false, valid: true, brokenIndex: null };
    }
};

// Phase 2 Task 2: Active cryptographic ledger signatures active
