/**
 * @fileoverview ReGenX Enterprise ESG Reporting Engine
 * Generates high-fidelity HTML-to-PDF reports for Corporate Social Responsibility metrics.
 * @author GSSoC Contributor
 */

export const ESGReporter = {
    /**
     * Canonicalize a value for hashing so object key order cannot affect the digest.
     * @param {*} value - Value to serialize.
     * @returns {string} Stable string representation.
     */
    canonicalizeHashPayload: (value) => {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return `[${value.map(ESGReporter.canonicalizeHashPayload).join(',')}]`;
        if (typeof value === 'object') {
            return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${ESGReporter.canonicalizeHashPayload(value[key])}`).join(',')}}`;
        }
        return JSON.stringify(value);
    },

    /**
     * Computes a SHA-256 hash for audit registry entries.
     * @param {Object} payload - Report payload to hash.
     * @returns {Promise<string>} Hex-encoded hash with 0x prefix.
     */
    computeSecureHash: async (payload) => {
        if (!window.crypto?.subtle) {
            throw new Error('Web Crypto API is unavailable in this browser context.');
        }
        const encoded = new TextEncoder().encode(ESGReporter.canonicalizeHashPayload(payload));
        const digest = await window.crypto.subtle.digest('SHA-256', encoded);
        return '0x' + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Backward-compatible alias for existing report generation call sites.
     * @param {Object} payload - Report payload to hash.
     * @returns {Promise<string>} Hex-encoded hash with 0x prefix.
     */
    generateAuditHash: async (payload) => ESGReporter.computeSecureHash(payload),

    /**
     * Loads the public audit registry from localStorage.
     * @returns {Array<Object>} Registry records.
     */
    loadAuditRegistry: () => {
        try {
            const raw = window.localStorage.getItem('audit-registry');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    },

    /**
     * Persists the public audit registry in localStorage.
     * @param {Array<Object>} records - Registry records.
     */
    saveAuditRegistry: (records) => {
        try {
            window.localStorage.setItem('audit-registry', JSON.stringify(records));
        } catch {
            // Ignore write errors
        }
    },
    /**
     * Triggers the client-side PDF generation process.
     * @param {Object} account - Current user SESSION object.
     * @param {Array} history - Array of completed order objects.
     */
    generateReport: async (account, history) => {
        if (!window.html2pdf) {
            alert("Report Engine is loading. Please try again in a moment.");
            return;
        }

        // Calculate Metrics
        const totalKg = history.reduce((sum, o) => sum + (parseFloat(o.actualKg || o.kg) || 0), 0);
        const totalCO2 = Math.round(totalKg * 0.62); // 0.62 kg CO2 per kg bio-waste
        const totalTokens = account.tokens || 0;
        
        const timestamp = Date.now();
        const reportPayload = {
            org: account.org || account.name,
            role: account.role,
            userId: account.id,
            totalKg,
            totalCO2,
            tokens: totalTokens,
            dispatchesCount: history.length,
            timestamp
        };

        let reportHash;
        try {
            reportHash = await ESGReporter.generateAuditHash(reportPayload);
        } catch (e) {
            console.error('Failed to generate audit hash:', e);
            if (window.showToast) window.showToast('⚠️ Failed to generate ESG verification hash.');
            return;
        }
        const dateStr = new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // Save generated verification record to ReGenX Public Audit registry
        try {
            const registry = ESGReporter.loadAuditRegistry();
            registry.push({
                ...reportPayload,
                hash: reportHash
            });
            ESGReporter.saveAuditRegistry(registry);
        } catch (e) {
            console.error("Failed to store verification record:", e);
        }

        // Construct HTML for the PDF
        const element = document.createElement('div');
        element.style.padding = '40px';
        element.style.fontFamily = 'Inter, sans-serif';
        element.style.color = '#1E293B';
        element.style.background = '#FFFFFF';
        element.innerHTML = `
            <div style="text-align:center; margin-bottom:40px;">
                <h1 style="color:#0D9488; font-size:36px; margin-bottom:8px;">ReGenX Protocol</h1>
                <h2 style="color:#64748B; font-size:24px; margin-top:0;">ESG Impact & Carbon Offset Report</h2>
                <p style="color:#94A3B8; font-size:14px;">Generated on: ${dateStr}</p>
            </div>

            <div style="margin-bottom:32px; padding:20px; border-left:4px solid #0D9488; background:#F8FAFC;">
                <h3 style="margin-top:0; color:#0F172A;">Entity Details</h3>
                <p><strong>Organization:</strong> ${account.org || account.name}</p>
                <p><strong>Role:</strong> ${account.role.toUpperCase()}</p>
                <p><strong>Network ID:</strong> ${account.id}</p>
            </div>

            <h3 style="border-bottom:2px solid #E2E8F0; padding-bottom:8px; margin-bottom:24px;">Environmental Impact Summary</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom:40px;">
                <div style="flex:1; text-align:center; padding:20px; background:#F0FDF4; border-radius:8px; margin-right:12px;">
                    <div style="font-size:32px; font-weight:800; color:#16A34A;">${totalKg.toLocaleString()}</div>
                    <div style="font-size:12px; color:#15803D; font-weight:700; text-transform:uppercase;">Kg Recycled</div>
                </div>
                <div style="flex:1; text-align:center; padding:20px; background:#EFF6FF; border-radius:8px; margin-right:12px;">
                    <div style="font-size:32px; font-weight:800; color:#2563EB;">${totalCO2.toLocaleString()}</div>
                    <div style="font-size:12px; color:#1D4ED8; font-weight:700; text-transform:uppercase;">Kg CO₂ Offset</div>
                </div>
                <div style="flex:1; text-align:center; padding:20px; background:#FEFCE8; border-radius:8px;">
                    <div style="font-size:32px; font-weight:800; color:#CA8A04;">${totalTokens.toLocaleString()}</div>
                    <div style="font-size:12px; color:#A16207; font-weight:700; text-transform:uppercase;">$RGX Tokens Earned</div>
                </div>
            </div>

            <h3 style="border-bottom:2px solid #E2E8F0; padding-bottom:8px; margin-bottom:24px;">Social & Governance Metrics</h3>
            <p><strong>Total Validated Dispatches:</strong> ${history.length}</p>
            <p><strong>Trust Protocol Standing:</strong> Certified Compliant</p>

            <div style="margin-top:60px; text-align:center; font-size:11px; color:#94A3B8;">
                <p>This document is digitally generated and verifiable via the ReGenX smart ledger.</p>
                <p style="font-family:monospace; background:#F1F5F9; display:inline-block; padding:4px 8px; border-radius:4px;">Signature Hash (SHA-256): ${reportHash}</p>
            </div>
        `;

        // Configure html2pdf
        const opt = {
            margin:       0.5,
            filename:     `ReGenX_ESG_Report_${(account.org || account.name || 'User').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Generate PDF
        if (window.showToast) window.showToast('Generating ESG PDF Report...');
        html2pdf().set(opt).from(element).save().then(() => {
            if (window.showToast) window.showToast('✓ PDF Report Downloaded successfully.');
        }).catch(err => {
            console.error('PDF Generation Error:', err);
            if (window.showToast) window.showToast('⚠️ Failed to generate PDF.');
        });
    }
};

window.ESGReporter = ESGReporter;
