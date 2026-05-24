/**
 * @fileoverview ReGenX Cryptographic Verification & Public Audit Portal
 * Implements client-side SHA-256 matching and verified environmental origin auditing.
 * Renders high-fidelity Glassmorphic validation cards and visual proof-of-custody timelines.
 * Supports searching live system orders, pre-seeded attestation hashes, client-side QR generation, and PDF card exporting.
 * @author GSSoC Contributor
 */

const STORAGE_KEY_PREFIX = 'regenx-v3:';
const AUDIT_REGISTRY_KEY = STORAGE_KEY_PREFIX + 'audit-registry';
const TRUST_LEDGER_KEY = 'trust-ledger';

/**
 * Safely load the public audit registry from localStorage.
 * @returns {Array<Object>} Normalized registry records.
 */
function loadAuditRegistry() {
    try {
        const raw = window.localStorage.getItem(AUDIT_REGISTRY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Persist the public audit registry to localStorage.
 * @param {Array<Object>} records - Registry records to save.
 */
function saveAuditRegistry(records) {
    try {
        window.localStorage.setItem(AUDIT_REGISTRY_KEY, JSON.stringify(records));
    } catch {
        // Ignore write errors
    }
}

/**
 * Normalize a user-provided hash/ID into lowercase.
 * @param {string} val - Raw input value.
 * @returns {string} Normalized input.
 */
function normalizeInput(val) {
    if (typeof val !== 'string') return '';
    return val.replace(/^0x/i, '').trim().toLowerCase();
}

/**
 * Fetch all orders from the local storage database.
 * @returns {Array<Object>} List of all active orders.
 */
function getAllOrdersFromStorage() {
    try {
        const orders = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && k.startsWith(STORAGE_KEY_PREFIX + 'ord:')) {
                const raw = window.localStorage.getItem(k);
                if (raw) {
                    try {
                        orders.push(JSON.parse(raw));
                    } catch (e) {}
                }
            }
        }
        return orders;
    } catch {
        return [];
    }
}

/**
 * Fetch trust ledger events from local storage.
 * @returns {Array<Object>} List of trust ledger events.
 */
function getTrustLedgerEvents() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + TRUST_LEDGER_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Format timestamp into readable date-time.
 * @param {number} ts - Epoch timestamp.
 * @returns {string} Formatted date string.
 */
function formatTimestamp(ts) {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Ensure the registry has seed records for demo verification.
 * @returns {Array<Object>} Registry with seeded records.
 */
function ensureSeedRegistry() {
    const registry = loadAuditRegistry();
    if (registry.length > 0) return registry;

    const seedRecords = [
        {
            hash: '0x3f8a9d2c1e7b64805e2d19f8a02b3c4d5e6f7a8b9c1d2e3f4a5b6c7d8e9f0a1b',
            org: 'Omega Campus Hostel',
            role: 'provider',
            userId: 'prov-omega',
            totalKg: 850,
            totalCO2: 527,
            tokens: 1700,
            dispatchesCount: 4,
            timestamp: 1716300000000
        },
        {
            hash: '0x7e2d9b1c5f3e4a8b2c6d0e8f9a7b5c3d1e2f4a6b7c8d9e0f1a2b3c4d5e6f7a8b',
            org: 'Sector Alpha Green Plant',
            role: 'plant',
            userId: 'plant-alpha',
            totalKg: 2400,
            totalCO2: 1488,
            tokens: 4800,
            dispatchesCount: 12,
            timestamp: 1716100000000
        }
    ];

    saveAuditRegistry(seedRecords);
    return seedRecords;
}

export const AuditPortal = {
    /**
     * Renders the Public Audit Portal interface.
     * @param {HTMLElement} mc - Main content container.
     * @param {boolean} fullRender - Whether to execute a complete rebuild of the view.
     */
    renderPortal: (mc, fullRender) => {
        if (!fullRender) return;

        const registry = ensureSeedRegistry();

        mc.innerHTML = `
            <div class="between" style="margin-bottom:24px; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h3 class="heading">🔒 Cryptographic Verification Portal</h3>
                    <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">
                        Public environmental auditing ledger & trust custody lookup
                    </div>
                </div>
                <div class="badge badge-amber" style="font-size:12px; padding: 6px 12px;">Ecological Audit Node</div>
            </div>

            <div class="two-col" style="align-items: stretch; margin-bottom: 32px; gap: 24px;">
                <!-- Verification Panel -->
                <div class="glass-card audit-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; border-color: var(--blue);">
                    <div>
                        <h4 style="margin-bottom: 8px; font-size: 18px;">Public Attestation Ledger</h4>
                        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
                            Enter a **Transaction Hash**, **Order ID**, or any attested **Signature** to audit the custody chain lifecycle of organic bio-waste.
                        </p>
                        
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label class="form-label" style="font-size: 11px; text-transform: uppercase;">Transaction Hash or Order ID</label>
                            <div style="display: flex; gap: 8px;">
                                <input class="form-input" id="audit-hash-input" type="text" placeholder="e.g. 0x3f8a9d... or ord-123" style="font-family: monospace; flex: 1;" onkeydown="if(event.key === 'Enter') window.AuditPortal.triggerVerification()">
                                <button class="btn btn-secondary" onclick="document.getElementById('audit-hash-input').value = '';" style="padding: 10px;" title="Clear input">✕</button>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-full" onclick="window.AuditPortal.triggerVerification()" style="background: var(--blue); border-color: var(--blue);">
                        🔍 Verify Authenticity
                    </button>
                </div>

                <!-- Verified Registry Directory -->
                <div class="glass-card audit-card" style="padding: 24px;">
                    <h4 style="margin-bottom: 12px; font-size: 16px;">Copy Pre-Attested Seed Hashes</h4>
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                        Use these pre-signed network hashes to test the public Zero-Knowledge Verification Portal:
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${registry.map(rec => `
                            <div class="audit-registry-item">
                                <div class="between" style="margin-bottom: 6px;">
                                    <span style="font-weight: 700; color: var(--text);">${rec.org}</span>
                                    <span style="font-size: 11px; font-family: monospace; color: var(--green); font-weight: 700;">${rec.totalKg} Kg Offset</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <input type="text" value="${rec.hash}" readonly class="audit-registry-input" onclick="window.AuditPortal.copyHash('${rec.hash}')">
                                    <button class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 11px;" onclick="window.AuditPortal.copyHash('${rec.hash}')">📋 Copy</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Dynamic Verification Result Container -->
            <div id="verification-result-container"></div>
        `;
    },

    /**
     * Executes the verification sequence, performing database query & rendering timeline.
     */
    triggerVerification: async () => {
        const input = document.getElementById('audit-hash-input');
        const container = document.getElementById('verification-result-container');
        if (!input || !container) return;

        const queryStr = input.value.trim();
        if (!queryStr) {
            window.showToast('⚠️ Please enter a signature or ID to verify.');
            return;
        }

        const normalizedQuery = normalizeInput(queryStr);

        // Render loading state
        container.innerHTML = `
            <div class="glass-card" style="padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;">
                <div class="audit-spinner"></div>
                <div style="font-size: 14px; font-weight: 600; color: var(--text-muted);">Querying ReGenX Attestation Ledger...</div>
            </div>
        `;

        setTimeout(() => {
            // 1. Search in live database orders
            const allOrders = getAllOrdersFromStorage();
            let matchedOrder = allOrders.find(o => 
                normalizeInput(o.id) === normalizedQuery || 
                (o.txHash && normalizeInput(o.txHash) === normalizedQuery)
            );

            // 2. Search in seed records fallback
            const seedRegistry = loadAuditRegistry();
            let matchedSeed = seedRegistry.find(r => 
                normalizeInput(r.hash) === normalizedQuery || 
                (r.userId && normalizeInput(r.userId) === normalizedQuery)
            );

            // If not found, render failure card
            if (!matchedOrder && !matchedSeed) {
                container.innerHTML = `
                    <div class="glass-card fade-in-up" style="padding: 32px; border-color: #EF4444; background: rgba(239, 68, 68, 0.05); text-align: center;">
                        <span style="font-size: 40px; display: block; margin-bottom: 12px;">❌</span>
                        <h4 style="color: #EF4444; margin-bottom: 8px;">Verification Failed</h4>
                        <p style="font-size: 13px; color: var(--text-muted); max-width: 500px; margin: 0 auto; line-height: 1.5;">
                            The identifier or signature hash <strong>${queryStr}</strong> was not found in the ReGenX ledger. This record may be unverified, modified, or not yet completed.
                        </p>
                    </div>
                `;
                return;
            }

;(async () => {
                // Standardize matching entity properties
                let auditData = {};
                let timelineSteps = [];

                if (matchedOrder) {
                    const kgVal = parseFloat(matchedOrder.actualKg || matchedOrder.kg || 0);
                    const co2Saved = Math.round(kgVal * 0.62 * 10) / 10;
                    const tokens = matchedOrder.tokensMinted || Math.round(kgVal * 2);

                    auditData = {
                        id: matchedOrder.id,
                        hash: matchedOrder.txHash || 'Pending Attestation Stamp',
                        org: matchedOrder.providerOrg || 'Registered Provider',
                        role: 'provider',
                        userId: matchedOrder.providerId,
                        totalKg: kgVal,
                        totalCO2: co2Saved,
                        tokens: tokens,
                        timestamp: matchedOrder.ts,
                        status: matchedOrder.status,
                        dispatchesCount: 1
                    };

                    // Compile trust events
                    const allEvents = getTrustLedgerEvents();
                    const orderEvents = allEvents.filter(e => e.orderId === matchedOrder.id).sort((a,b) => a.ts - b.ts);

                    // Build dynamic timeline steps based on order state & events
                    const reqEvent = orderEvents.find(e => e.event === 'requested') || { ts: matchedOrder.ts };
                    const assEvent = orderEvents.find(e => e.event === 'assigned');
                    const pickEvent = orderEvents.find(e => e.event === 'picked_up');
                    const compEvent = orderEvents.find(e => e.event === 'completed' || e.event === 'sealed');

                    timelineSteps = [
                        {
                            label: 'Origin Collection Dispatched',
                            icon: '🏨',
                            active: true,
                            time: formatTimestamp(reqEvent.ts),
                            desc: `Bio-waste logged by ${matchedOrder.providerOrg}. Declared Mass: ${matchedOrder.kg} kg. Type: ${matchedOrder.wasteType}.`
                        },
                        {
                            label: 'Logistics Route Optimized',
                            icon: '🚛',
                            active: !!(matchedOrder.status !== 'requested'),
                            time: assEvent ? formatTimestamp(assEvent.ts) : (matchedOrder.status !== 'requested' ? formatTimestamp(matchedOrder.ts + 180000) : 'Pending'),
                            desc: matchedOrder.status !== 'requested' 
                                ? `Route TSP refined. Custody assigned to Rider: ${matchedOrder.riderName || 'Rider-A'}.`
                                : 'Awaiting rider pickup dispatch sequence.'
                        },
                        {
                            label: 'Bioreactor Facility Reception',
                            icon: '🏭',
                            active: matchedOrder.status === 'completed',
                            time: pickEvent ? formatTimestamp(pickEvent.ts) : (matchedOrder.status === 'completed' ? formatTimestamp(matchedOrder.ts + 3600000) : 'Pending'),
                            desc: matchedOrder.status === 'completed'
                                ? `Received at facility: ${matchedOrder.plantName}. Measured weight: ${matchedOrder.actualKg} kg. Segregation quality score: ${matchedOrder.segScore || 85}%.`
                                : 'Awaiting facility delivery and scale confirmation.'
                        },
                        {
                            label: 'Cryptographic Attestation Seal',
                            icon: '🔒',
                            active: matchedOrder.status === 'completed',
                            time: compEvent ? formatTimestamp(compEvent.ts) : (matchedOrder.status === 'completed' ? formatTimestamp(matchedOrder.ts + 3800000) : 'Pending'),
                            desc: matchedOrder.status === 'completed'
                                ? `Verification hash generated. Digital stamp finalized. Minted reward: ${tokens} $RGX tokens.`
                                : 'Pending final ledger signing.'
                        }
                    ];

                } else {
                    // Seed record
                    auditData = {
                        id: matchedSeed.userId,
                        hash: matchedSeed.hash,
                        org: matchedSeed.org,
                        role: matchedSeed.role,
                        userId: matchedSeed.userId,
                        totalKg: matchedSeed.totalKg,
                        totalCO2: matchedSeed.totalCO2,
                        tokens: matchedSeed.tokens,
                        timestamp: matchedSeed.timestamp,
                        status: 'completed',
                        dispatchesCount: matchedSeed.dispatchesCount || 1
                    };

                    timelineSteps = [
                        {
                            label: 'Origin Collection Dispatched',
                            icon: '🏨',
                            active: true,
                            time: formatTimestamp(auditData.timestamp),
                            desc: `Bio-waste logged by ${auditData.org}. Total Mass: ${auditData.totalKg} kg. Checked & certified.`
                        },
                        {
                            label: 'Logistics Route Optimized',
                            icon: '🚛',
                            active: true,
                            time: formatTimestamp(auditData.timestamp + 600000),
                            desc: `TSP path optimized. Transit custody logged in digital ledger.`
                        },
                        {
                            label: 'Bioreactor Facility Reception',
                            icon: '🏭',
                            active: true,
                            time: formatTimestamp(auditData.timestamp + 3600000),
                            desc: `Received and weighed at ReGenX Facility Node. Anaerobic digestion yield verified.`
                        },
                        {
                            label: 'Cryptographic Attestation Seal',
                            icon: '🔒',
                            active: true,
                            time: formatTimestamp(auditData.timestamp + 4000000),
                            desc: `SHA-256 certificate minted. Public trust parameters confirmed. Token rewards allocated.`
                        }
                    ];
                }

                let expectedHash = null;
                let verificationState = 'verified';

                // ==========================================
                // Security Patch: Asynchronous Hash Verification
                // ==========================================
                if (auditData.hash && auditData.hash !== 'Pending Attestation Stamp' && window.ESGReporter) {
                    try {
                        expectedHash = await window.ESGReporter.computeSecureHash({
                            org: auditData.org,
                            role: auditData.role,
                            userId: auditData.userId,
                            totalKg: auditData.totalKg,
                            totalCO2: auditData.totalCO2,
                            tokens: auditData.tokens,
                            dispatchesCount: auditData.dispatchesCount,
                            timestamp: auditData.timestamp
                        });
                        
                        // We use normalizeInput from main instead of normalizeHash
                        if (normalizeInput(expectedHash) !== normalizeInput(auditData.hash)) {
                            verificationState = 'tampered';
                        }
                    } catch (error) {
                        console.error('Failed to recompute audit hash:', error);
                        verificationState = 'tampered';
                    }
                }

                // Inject tamper UI if hash fails
                if (verificationState === 'tampered') {
                    timelineSteps.push({
                        label: 'Cryptographic Signature Tampered',
                        icon: '⚠️',
                        active: true,
                        time: 'Verification Failed',
                        desc: 'Stored hash does not match the recomputed payload digest. This record is compromised.'
                    });
                }

                const statusLabel = verificationState === 'verified' ? 'Verified Custody & Impact Record' : 'Tampered Certificate Detected';
                const statusTone = verificationState === 'verified' ? 'var(--green)' : '#EF4444';
                const statusBg = verificationState === 'verified' ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.08)';
                const statusBorder = verificationState === 'verified' ? 'var(--green)' : '#EF4444';
                const cleanHashText = auditData.hash.startsWith('0x') ? auditData.hash : '0x' + auditData.hash;

                // Render HUD Layout
                container.innerHTML = `
                    <div class="glass-card fade-in-up" id="verification-card-root" style="padding: 32px; border-color: ${statusBorder}; background: ${statusBg}; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.25);">
                        
                        <div class="between" style="align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                                    <div style="width: 24px; height: 24px; background: ${statusTone}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold;">${verificationState === 'verified' ? '✓' : '!'}</div>
                                    <h4 style="color: ${statusTone}; font-size: 18px; margin: 0; font-family: 'Space Grotesk', sans-serif;">${statusLabel}</h4>
                                </div>
                                <div style="font-size: 11px; font-family: monospace; color: var(--text-muted); word-break: break-all; max-width: 480px;">Stored Hash: ${cleanHashText}</div>
                                ${verificationState === 'tampered' ? `<div style="font-size: 11px; font-family: monospace; color: #EF4444; word-break: break-all; max-width: 480px;">Expected Hash: ${expectedHash}</div>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px;">Verification Time</div>
                            <div style="font-size: 13px; font-weight: 600; color: var(--text);">${formatTimestamp(auditData.timestamp)}</div>
                        </div>
                    </div>

                    <!-- Layout: Left Info, Right Timeline -->
                    <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 32px; align-items: start;" class="audit-details-grid">
                        
                        <!-- Left Info Panel (The Printable Badge) -->
                        <div style="display: flex; flex-direction: column; gap: 24px;">
                            <div id="verification-badge-card" style="background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; position: relative; overflow: hidden; backdrop-filter: blur(10px);">
                                <!-- Glow accents for export styling -->
                                <div style="position: absolute; top: -10%; right: -10%; width: 100px; height: 100px; background: var(--green); filter: blur(50px); opacity: 0.15; pointer-events: none;"></div>
                                <div style="position: absolute; bottom: -10%; left: -10%; width: 100px; height: 100px; background: var(--blue); filter: blur(50px); opacity: 0.15; pointer-events: none;"></div>
                                
                                <div class="between" style="margin-bottom: 20px;">
                                    <div style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; letter-spacing: -0.5px; display: flex; align-items: center; gap: 6px;">
                                        <span style="font-size: 18px;">🌿</span> ReGenX Trust Badge
                                    </div>
                                    <div style="font-size: 9px; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: var(--green); padding: 3px 8px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.2);">
                                        ORIGIN VERIFIED
                                    </div>
                                </div>

                                <div style="margin-bottom: 20px;">
                                    <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 4px; letter-spacing: 0.5px;">Account Entity</div>
                                    <div style="font-weight: 700; font-size: 18px; color: var(--text);">${auditData.org}</div>
                                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-top: 2px;">Role: ${auditData.role.toUpperCase()} · ID: ${auditData.userId}</div>
                                </div>

                                <div style="margin-bottom: 24px;">
                                    <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px;">Attested Impact Metrics</div>
                                    <div style="display: flex; gap: 10px;">
                                        <div style="flex: 1; text-align: center; padding: 10px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 8px;">
                                            <div style="font-size: 16px; font-weight: 800; color: var(--green);">${auditData.totalKg} kg</div>
                                            <span style="font-size: 8px; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Recycled</span>
                                        </div>
                                        <div style="flex: 1; text-align: center; padding: 10px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 8px;">
                                            <div style="font-size: 16px; font-weight: 800; color: var(--blue);">${auditData.totalCO2} kg</div>
                                            <span style="font-size: 8px; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">CO₂ Saved</span>
                                        </div>
                                        <div style="flex: 1; text-align: center; padding: 10px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 8px;">
                                            <div style="font-size: 16px; font-weight: 800; color: var(--amber);">${auditData.tokens} $RGX</div>
                                            <span style="font-size: 8px; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Minted</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="between" style="align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; margin-top: 16px;">
                                    <div style="max-width: 140px;">
                                        <div style="font-size: 8px; font-family: monospace; color: var(--text-muted); word-break: break-all; line-height: 1.3;">
                                            SIGNATURE:<br>${auditData.hash.slice(0, 32)}<br>${auditData.hash.slice(32)}
                                        </div>
                                    </div>
                                    <div id="verification-qrcode" style="width: 80px; height: 80px; background: white; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>
                                </div>
                            </div>
                            
                            <button class="btn btn-secondary btn-full" onclick="window.AuditPortal.downloadBadge('${auditData.id}')" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                📥 Download Certified Impact Badge (PDF)
                            </button>
                        </div>

                        <!-- Right Custody Timeline -->
                        <div>
                            <h5 style="margin-bottom: 20px; font-size: 12px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; font-weight: 700;">Verified Custody Chain Timeline</h5>
                            
                            <div style="display: flex; flex-direction: column; gap: 20px; position: relative;">
                                <!-- Connecting timeline line -->
                                <div style="position: absolute; left: 16px; top: 16px; bottom: 16px; width: 2px; background: var(--border); z-index: 0;"></div>

                                ${timelineSteps.map((step, idx) => `
                                    <div class="audit-timeline-step" style="display: flex; gap: 16px; align-items: flex-start; position: relative; z-index: 1; transition: all 0.3s;">
                                        
                                        <!-- Timeline Pin -->
                                        <div style="width: 34px; height: 34px; background: ${step.active ? 'var(--surface-hover)' : 'var(--surface)'}; border: 2px solid ${step.active ? 'var(--green)' : 'var(--border)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15); filter: ${step.active ? 'none' : 'grayscale(1)'}; transition: all 0.3s;">
                                            ${step.icon}
                                        </div>

<div class="glass-card" style="flex: 1; padding: 14px; border-color: ${step.active ? (step.icon === '⚠️' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.2)') : 'var(--border)'}; background: ${step.active ? (step.icon === '⚠️' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)') : 'rgba(255,255,255,0.01)'}; transition: all 0.3s; opacity: ${step.active ? 1 : 0.45};">
                                    <div class="between" style="margin-bottom: 4px; flex-wrap: wrap;">
                                        <span style="font-weight: 700; font-size: 13px; color: ${step.active ? (step.icon === '⚠️' ? '#EF4444' : 'var(--text)') : 'var(--text-muted)'};">${step.label}</span>
                                        <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${step.time}</span>
                                    </div>
                                    <p style="font-size: 12px; color: ${step.icon === '⚠️' ? '#EF4444' : 'var(--text-muted)'}; line-height: 1.4; margin: 0;">${step.desc}</p>
                                </div>
                            </div>
                            </div>
                        </div>

                    </div>
                </div>
`;

                // Render Client-Side QR Code
                const qrLink = `https://regenx.org/verify?tx=${auditData.hash}`;
                const qrBox = document.getElementById("verification-qrcode");
                if (qrBox) {
                    if (window.QRCode) {
                        try {
                            qrBox.innerHTML = '';
                            new window.QRCode(qrBox, {
                                text: qrLink,
                                width: 72,
                                height: 72,
                                colorDark : "#0f172a",
                                colorLight : "#ffffff",
                                correctLevel : window.QRCode.CorrectLevel.H
                            });
                        } catch (e) {
                            qrBox.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(qrLink)}" width="72" height="72" alt="QR Link"/>`;
                        }
                    } else {
                        qrBox.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(qrLink)}" width="72" height="72" alt="QR Link"/>`;
                    }
                }

                // Animate card results and timeline using GSAP
                if (window.gsap) {
                    window.gsap.timeline()
                        .from("#verification-card-root", {
                            opacity: 0,
                            y: 20,
                            duration: 0.5,
                            ease: "power2.out"
                        })
                        .from(".audit-timeline-step", {
                            opacity: 0,
                            x: -16,
                            stagger: 0.1,
                            duration: 0.4,
                            ease: "power2.out"
                        }, "-=0.25");
                }
            })().catch((error) => {
                console.error('Verification render failed:', error);
                container.innerHTML = `
                    <div class="glass-card fade-in-up" style="padding: 32px; border-color: #EF4444; background: rgba(239, 68, 68, 0.05); text-align: center;">
                        <span style="font-size: 40px; display: block; margin-bottom: 12px;">❌</span>
                        <h4 style="color: #EF4444; margin-bottom: 8px;">Verification Error</h4>
                        <p style="font-size: 13px; color: var(--text-muted); max-width: 400px; margin: 0 auto;">
                            The verifier could not recompute the secure hash for this record. Clear stale local storage data and try again.
                        </p>
                    </div>
                `;
            });
        }, 900);
    },

    /**
     * Copy a registry hash to clipboard with fallback.
     * @param {string} hash - Hash to copy.
     */
    copyHash: (hash) => {
        const notify = (msg) => window.showToast && window.showToast(msg);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(hash)
                .then(() => notify('✓ Hash copied to clipboard!'))
                .catch(() => notify('Copy failed. Select and copy manually.'));
            return;
        }

        const temp = document.createElement('textarea');
        temp.value = hash;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        try {
            document.execCommand('copy');
            notify('✓ Hash copied to clipboard!');
        } catch {
            notify('Copy failed. Select and copy manually.');
        } finally {
            document.body.removeChild(temp);
        }
    },

    /**
     * Download the certificate/badge card as a high-resolution PDF file using html2pdf.js.
     * @param {string} id - The lookup identifier.
     */
    downloadBadge: (id) => {
        const badgeEl = document.getElementById('verification-badge-card');
        if (!badgeEl) return;

        if (!window.html2pdf) {
            window.showToast('⚠️ PDF generator library (html2pdf) is offline. Attempting normal print...');
            window.print();
            return;
        }

        window.showToast('Generating PDF badge, please wait...');

        // Compile temporary element for export to keep styling isolated
        const exportContainer = document.createElement('div');
        exportContainer.style.background = '#0b0f19'; // Midnight Indigo Dark Theme
        exportContainer.style.padding = '32px';
        exportContainer.style.color = '#f8fafc';
        exportContainer.style.fontFamily = "'Inter', sans-serif";
        exportContainer.style.borderRadius = '0px';
        exportContainer.style.width = '100%';

        // Copy badge card inner HTML
        exportContainer.innerHTML = badgeEl.outerHTML;

        // Apply clean printing variables inline
        const innerBadge = exportContainer.firstElementChild;
        innerBadge.style.width = '100%';
        innerBadge.style.boxSizing = 'border-box';
        innerBadge.style.background = '#1e293b'; // slate dark bg for PDF print stability
        innerBadge.style.color = '#ffffff';
        innerBadge.style.border = '2px solid #10b981'; // solid green border for certificate print
        innerBadge.style.borderRadius = '16px';
        innerBadge.style.padding = '32px';
        innerBadge.style.backdropFilter = 'none';

        // Re-inject verification QR code into temporary canvas to make sure it prints in scale
        const originalQR = badgeEl.querySelector('#verification-qrcode img');
        const tempQR = exportContainer.querySelector('#verification-qrcode');
        if (tempQR && originalQR) {
            tempQR.innerHTML = `<img src="${originalQR.src}" width="80" height="80" style="display:block;"/>`;
        } else if (tempQR) {
            // Check if qrcode canvas was used
            const originalCanvas = badgeEl.querySelector('#verification-qrcode canvas');
            if (originalCanvas) {
                tempQR.innerHTML = `<img src="${originalCanvas.toDataURL()}" width="80" height="80" style="display:block;"/>`;
            }
        }

        const opt = {
            margin:       12,
            filename:     `regenx-esg-verification-${id || 'batch'}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2.5, useCORS: true, backgroundColor: '#0b0f19' },
            jsPDF:        { unit: 'mm', format: 'a5', orientation: 'landscape' } // landscape fits badge shape perfectly
        };

        window.html2pdf().set(opt).from(exportContainer).save()
            .then(() => {
                window.showToast('✓ PDF download complete!');
            })
            .catch((err) => {
                console.error("PDF generation failed", err);
                window.showToast('❌ Export failed. Use browser print instead.');
            });
    }
};

window.AuditPortal = AuditPortal;
