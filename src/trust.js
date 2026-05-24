/**
 * @fileoverview ReGenX Trust Protocol Module
 * Handles decentralized identity (DID), trust scoring, and reward scaling.
 * Phase 2 Upgrade: Enhanced SHA-256 trust ledger security validations.
 * @author GSSoC Contributor
 */

const SHA256_INITIAL_STATE = new Uint32Array([
    0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
    0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
]);

const SHA256_ROUNDS = new Uint32Array([
    0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
    0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
    0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
    0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
    0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
    0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
    0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
    0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
]);

const ledgerTextEncoder = new TextEncoder();

function rotateRight(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
}

function normalizeLedgerNumber(value) {
    return Number.isFinite(value) ? value : null;
}

function normalizeLedgerString(value) {
    return typeof value === 'string' ? value : String(value ?? '');
}

function buildLedgerPayload(entry, previousHash = 'GENESIS') {
    return JSON.stringify({
        previousHash: normalizeLedgerString(previousHash || 'GENESIS'),
        orderId: normalizeLedgerString(entry?.orderId),
        event: normalizeLedgerString(entry?.event),
        ts: normalizeLedgerNumber(entry?.ts),
        actorRole: normalizeLedgerString(entry?.actorRole),
        actorId: normalizeLedgerString(entry?.actorId),
        lat: normalizeLedgerNumber(entry?.lat),
        lng: normalizeLedgerNumber(entry?.lng)
    });
}

function sha256HexSync(message) {
    const messageBytes = ledgerTextEncoder.encode(message);
    const bitLength = messageBytes.length * 8;
    const paddedLength = ((messageBytes.length + 9 + 63) >> 6) << 6;
    const data = new Uint8Array(paddedLength);
    data.set(messageBytes);
    data[messageBytes.length] = 0x80;

    const view = new DataView(data.buffer);
    view.setUint32(data.length - 8, Math.floor(bitLength / 0x100000000));
    view.setUint32(data.length - 4, bitLength >>> 0);

    const state = SHA256_INITIAL_STATE.slice();
    const schedule = new Uint32Array(64);

    for (let offset = 0; offset < data.length; offset += 64) {
        for (let index = 0; index < 16; index++) {
            schedule[index] = view.getUint32(offset + (index * 4));
        }

        for (let index = 16; index < 64; index++) {
            const value15 = schedule[index - 15];
            const value2 = schedule[index - 2];
            const sigma0 = rotateRight(value15, 7) ^ rotateRight(value15, 18) ^ (value15 >>> 3);
            const sigma1 = rotateRight(value2, 17) ^ rotateRight(value2, 19) ^ (value2 >>> 10);
            schedule[index] = (schedule[index - 16] + sigma0 + schedule[index - 7] + sigma1) >>> 0;
        }

        let a = state[0];
        let b = state[1];
        let c = state[2];
        let d = state[3];
        let e = state[4];
        let f = state[5];
        let g = state[6];
        let h = state[7];

        for (let index = 0; index < 64; index++) {
            const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
            const choice = (e & f) ^ (~e & g);
            const temp1 = (h + sum1 + choice + SHA256_ROUNDS[index] + schedule[index]) >>> 0;
            const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
            const majority = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (sum0 + majority) >>> 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        state[0] = (state[0] + a) >>> 0;
        state[1] = (state[1] + b) >>> 0;
        state[2] = (state[2] + c) >>> 0;
        state[3] = (state[3] + d) >>> 0;
        state[4] = (state[4] + e) >>> 0;
        state[5] = (state[5] + f) >>> 0;
        state[6] = (state[6] + g) >>> 0;
        state[7] = (state[7] + h) >>> 0;
    }

    return `0x${Array.from(state, value => value.toString(16).padStart(8, '0')).join('')}`;
}

function normalizeLedgerEntry(entry, previousHash = 'GENESIS') {
    return {
        _v: 2,
        id: normalizeLedgerString(entry?.id || ''),
        orderId: normalizeLedgerString(entry?.orderId),
        event: normalizeLedgerString(entry?.event),
        ts: normalizeLedgerNumber(entry?.ts),
        lat: normalizeLedgerNumber(entry?.lat),
        lng: normalizeLedgerNumber(entry?.lng),
        actorRole: normalizeLedgerString(entry?.actorRole),
        actorId: normalizeLedgerString(entry?.actorId),
        trustScore: Number.isFinite(entry?.trustScore) ? entry.trustScore : 0,
        previousHash: normalizeLedgerString(previousHash || 'GENESIS'),
        hash: normalizeLedgerString(entry?.hash),
        sealed: true,
        verified: true
    };
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
    generateLedgerHash: async (entry, previousHash = 'GENESIS') => {
        const payload = buildLedgerPayload(entry, previousHash);
        if (window.crypto?.subtle?.digest) {
            const digest = await window.crypto.subtle.digest('SHA-256', ledgerTextEncoder.encode(payload));
            return `0x${Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')}`;
        }
        return sha256HexSync(payload);
    },

    /**
     * Verifies trust ledger chain continuity and hash integrity.
     * @param {Array<Object>} events - Trust ledger entries in storage order.
     * @returns {{valid:boolean,tampered:boolean,brokenIndex:(number|null)}} Integrity result.
     */
    verifyLedgerIntegrity: (events) => {
        if (!Array.isArray(events) || events.length === 0) {
            return { valid: true, tampered: false, brokenIndex: null };
        }

        let previousHash = 'GENESIS';

        for (let index = 0; index < events.length; index++) {
            const rawEntry = events[index] || {};
            const normalized = normalizeLedgerEntry(rawEntry, previousHash);
            const payload = buildLedgerPayload(normalized, previousHash);
            const expectedHash = sha256HexSync(payload);
            const hasHash = typeof rawEntry.hash === 'string' && rawEntry.hash.length > 0;
            const hasPreviousHash = typeof rawEntry.previousHash === 'string' && rawEntry.previousHash.length > 0;
            const isLegacyEntry = rawEntry._v !== 2 || !hasHash;

            if (hasPreviousHash && rawEntry.previousHash !== previousHash) {
                return { valid: false, tampered: true, brokenIndex: index };
            }

            if (!isLegacyEntry) {
                if (rawEntry.previousHash !== previousHash || rawEntry.hash !== expectedHash) {
                    return { valid: false, tampered: true, brokenIndex: index };
                }
                if (rawEntry.sealed !== true || rawEntry.verified !== true) {
                    return { valid: false, tampered: true, brokenIndex: index };
                }
            } else if (hasHash && rawEntry.hash !== expectedHash) {
                return { valid: false, tampered: true, brokenIndex: index };
            }

            if (!normalized.orderId || !normalized.event || !Number.isFinite(normalized.ts) || !normalized.actorRole || !normalized.actorId) {
                return { valid: false, tampered: true, brokenIndex: index };
            }

            previousHash = hasHash ? rawEntry.hash : expectedHash;
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
        const verification = TrustProtocol.verifyLedgerIntegrity(events);
        const analysis = TrustProtocol.analyzeIntegrity(events, route, distanceFn);
        if (!verification.valid) {
            return { score: 0, ...analysis, ...verification };
        }

        let score = 100;
        if (!events || events.length < 2) score -= 10;
        if (analysis.anomalies.timeGap) score -= 25;
        if (analysis.anomalies.routeDeviation) score -= 25;
        if (!analysis.anomalies.routeDeviation && analysis.maxDeviationKm > 0.7) score -= 10;
        score = Math.max(0, Math.min(100, Math.round(score)));
        return { score, ...analysis, ...verification };
    }
};

// Phase 2 Task 2: Active cryptographic ledger signatures active
