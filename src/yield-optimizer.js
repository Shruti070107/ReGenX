/**
 * @fileoverview ReGenX AI Digester Yield Optimization Engine
 * Mathematical models for predicting and optimizing anaerobic digestion.
 * Phase 2 Upgrade: Integrated biological yield estimation models based on organic purity.
 * @author GSSoC Contributor
 */

export const YieldOptimizer = {
    /**
     * Calculates the theoretical maximum Biogas yield based on incoming waste quality.
     * @param {Array} recentIntakes - Array of recently completed incoming orders.
     * @returns {Object} Prediction data containing theoretical yield and suggested temp.
     */
    predictYield: (recentIntakes) => {
        if (!recentIntakes || recentIntakes.length === 0) {
            return {
                predictedMethane: 0,
                optimalTemp: 35, // Fallback mesophilic digestion temperature.
                healthStatus: 'Idle',
                recommendation: 'Awaiting incoming waste for analysis.'
            };
        }

        // Calculate average segregation score (quality of organic matter)
        const totalScore = recentIntakes.reduce((sum, o) => {
            const rawScore = parseInt(o.segScore) || 50;
            const cappedScore = Math.max(0, Math.min(100, rawScore));
            return sum + cappedScore;
        }, 0);
        const avgScore = totalScore / recentIntakes.length;

        // Calculate total mass
        const totalKg = recentIntakes.reduce((sum, o) => sum + (parseFloat(o.actualKg || o.kg) || 0), 0);

        // Theoretical Model: 
        // High quality (Score > 80) yields ~0.8 m3/kg
        // Low quality (Score < 50) yields ~0.3 m3/kg
        const efficiencyMultiplier = Math.max(0.3, Math.min(0.8, avgScore / 100));
        const predictedMethane = totalKg * efficiencyMultiplier;

        // Optimize Temperature based on Quality
        // Hard to digest (low score) -> needs slightly higher temp (thermophilic shift)
        // Start with a standard mesophilic temperature
        let optimalTemp = 37.5;
        let recommendation = 'Maintain stable mesophilic conditions (37.5°C).';
        let healthStatus = 'Optimal';

        if (avgScore < 60) {
            optimalTemp = 42.0;
            recommendation = 'Incoming quality is low. Increase core temp to 42°C to accelerate breakdown.';
            healthStatus = 'Sub-optimal Blend';
        } else if (avgScore >= 85) {
            optimalTemp = 36.5;
            recommendation = 'High-purity organic matter detected. Keep temp at 36.5°C to prevent acidification.';
            healthStatus = 'Peak Efficiency';
        }

        return {
            predictedMethane: Math.round(predictedMethane * 10) / 10,
            optimalTemp,
            healthStatus,
            recommendation,
            avgScore: Math.round(avgScore)
        };
    }
};

// Phase 2 Task 7: Composting organic chemical models integrated
