/**
 * @fileoverview ReGenX AI Multi-Stop Route Optimization Engine
 * Implements Greedy Nearest-Neighbor with 2-Opt Local Search refinement to solve the TSP.
 * Accounts for dynamic payload load-weight factor routing, where hauling heavier loads
 * drains battery/fuel exponentially faster.
 * @author GSSoC Contributor
 */

import { YieldOptimizer } from './yield-optimizer.js';

/**
 * Constants for route optimization.
 * @type {Object}
 * @property {number} MAX_CAPACITY - The maximum vehicle capacity limit in kg (500kg).
 * @property {number} CO2_FACTOR - CO2 emitted in kg per km/cost unit saved (0.25kg).
 */
const CONFIG = {
    MAX_CAPACITY: 500,
    CO2_FACTOR: 0.25
};

export const RouteOptimizer = {
    /**
     * Solves the Traveling Salesperson Problem (TSP) by finding the optimal route sequence
     * that minimizes the load-weighted cost. Considers starting rider location, provider pickups,
     * and the plant as the final destination.
     * 
     * @param {Object} startPoint - The starting coordinates of the rider.
     * @param {number} startPoint.lat - Latitude of the starting location.
     * @param {number} startPoint.lng - Longitude of the starting location.
     * @param {Array<Object>} jobs - Array of active waste pickup jobs.
     * @param {string} jobs[].plantId - ID of the terminal processing plant.
     * @param {number} jobs[].providerLat - Latitude of the provider's pickup point.
     * @param {number} jobs[].providerLng - Longitude of the provider's pickup point.
     * @param {number|string} jobs[].kg - Weight of bio-waste to collect in kg.
     * @returns {Object} Optimization results containing jobs sequence and telemetry cost factors.
     */
    optimizeRoute: (startPoint, jobs) => {
        if (!jobs || jobs.length === 0) {
            return {
                optimizedJobs: [],
                originalDistance: 0,
                optimizedDistance: 0,
                originalCost: 0,
                optimizedCost: 0,
                savingsKm: 0,
                co2SavedKg: 0
            };
        }

        // 1. Resolve final destination plant from first job if available
        const plantId = jobs[0]?.plantId;
        let plant = null;
        if (plantId && typeof window !== 'undefined' && window.localStorage) {
            try {
                const raw = window.localStorage.getItem('regenx-v3:acc:' + plantId);
                plant = raw ? JSON.parse(raw) : null;
            } catch (e) {
                console.error("Failed to load plant from localStorage in RouteOptimizer:", e);
            }
        }

        // 2. Build points and weights arrays
        // Points: [startPoint, job1, job2, ..., plant]
        // Weights: [0, job1_weight, job2_weight, ..., 0]
        const points = [startPoint];
        const weights = [0];

        for (let i = 0; i < jobs.length; i++) {
            points.push({ lat: jobs[i].providerLat, lng: jobs[i].providerLng });
            weights.push(parseFloat(jobs[i].kg) || 0);
        }

        if (plant) {
            points.push({ lat: plant.lat, lng: plant.lng });
            weights.push(0);
        }

        const n = points.length;

        /**
         * Computes the geometric distance and load-weighted cost for a given tour sequence.
         * 
         * @param {Array<number>} t - Array of index sequences representing the tour path.
         * @returns {{distance: number, cost: number}} Object containing total distance and cost.
         */
        const calculateTourCostAndDist = (t) => {
            let totalDist = 0;
            let totalCost = 0;
            let currentWeight = 0;

            for (let i = 0; i < t.length - 1; i++) {
                const u = t[i];
                const v = t[i + 1];
                const dist = RouteOptimizer.calculateDistance(points[u].lat, points[u].lng, points[v].lat, points[v].lng);

                // Accumulate weight at node u before traveling to node v
                currentWeight += weights[u];

                // Cost function: Cost(A -> B) = Distance(A -> B) * (1.0 + Cumulative_Weight_At_A / Max_Vehicle_Capacity_Limit)
                const cost = dist * (1.0 + (currentWeight / CONFIG.MAX_CAPACITY));

                totalDist += dist;
                totalCost += cost;
            }
            return { distance: totalDist, cost: totalCost };
        };

        // 3. Handle single-job edge case
        if (jobs.length === 1) {
            const naiveTour = Array.from({ length: n }, (_, i) => i);
            const metrics = calculateTourCostAndDist(naiveTour);
            return {
                optimizedJobs: jobs,
                originalDistance: Math.round(metrics.distance * 100) / 100,
                optimizedDistance: Math.round(metrics.distance * 100) / 100,
                originalCost: Math.round(metrics.cost * 100) / 100,
                optimizedCost: Math.round(metrics.cost * 100) / 100,
                savingsKm: 0,
                co2SavedKg: 0
            };
        }

        // 4. Calculate Naive/Original Metrics (in receipt order)
        const naiveTour = Array.from({ length: n }, (_, i) => i);
        const naiveMetrics = calculateTourCostAndDist(naiveTour);

        // 5. Greedy Nearest-Neighbor search starting at 0, minimizing load-weighted cost
        let current = 0;
        let currentWeight = 0;
        const visited = new Set([0]);
        const tour = [0];

        // Only visit job nodes (indices 1 to jobs.length) in the loop
        const totalJobsCount = jobs.length;
        while (visited.size < totalJobsCount + 1) {
            let nextNode = -1;
            let minLegCost = Infinity;

            for (let i = 1; i <= totalJobsCount; i++) {
                if (!visited.has(i)) {
                    const dist = RouteOptimizer.calculateDistance(
                        points[current].lat, points[current].lng,
                        points[i].lat, points[i].lng
                    );
                    const weightCarried = currentWeight + weights[current];
                    const cost = dist * (1.0 + (weightCarried / CONFIG.MAX_CAPACITY));
                    if (cost < minLegCost) {
                        minLegCost = cost;
                        nextNode = i;
                    }
                }
            }

            if (nextNode !== -1) {
                currentWeight += weights[current];
                tour.push(nextNode);
                visited.add(nextNode);
                current = nextNode;
            } else {
                break;
            }
        }

        // Append final plant destination node if it exists
        if (plant) {
            tour.push(n - 1);
        }

        // 6. 2-Opt Local Search Refinement minimizing dynamic load-weighted cost
        let improved = true;
        let bestMetrics = calculateTourCostAndDist(tour);
        let bestCost = bestMetrics.cost;

        while (improved) {
            improved = false;
            // Reverse segments between jobs only (indices 1 to totalJobsCount)
            for (let i = 1; i < totalJobsCount; i++) {
                for (let j = i + 1; j <= totalJobsCount; j++) {
                    const newTour = RouteOptimizer.twoOptSwap(tour, i, j);
                    const newMetrics = calculateTourCostAndDist(newTour);

                    if (newMetrics.cost < bestCost) {
                        tour.splice(0, tour.length, ...newTour);
                        bestCost = newMetrics.cost;
                        bestMetrics = newMetrics;
                        improved = true;
                    }
                }
            }
        }

        // Map optimized indices back to jobs list
        const optimizedJobs = [];
        for (let i = 1; i <= totalJobsCount; i++) {
            optimizedJobs.push(jobs[tour[i] - 1]);
        }

        const savingsKm = Math.max(0, naiveMetrics.distance - bestMetrics.distance);
        // CO2 Saved recalculated comparing naive load-weighted cost against optimized load-weighted cost
        const co2SavedKg = Math.round((Math.max(0, naiveMetrics.cost - bestMetrics.cost) * CONFIG.CO2_FACTOR) * 100) / 100;

        return {
            optimizedJobs,
            originalDistance: Math.round(naiveMetrics.distance * 100) / 100,
            optimizedDistance: Math.round(bestMetrics.distance * 100) / 100,
            originalCost: Math.round(naiveMetrics.cost * 100) / 100,
            optimizedCost: Math.round(bestMetrics.cost * 100) / 100,
            savingsKm: Math.round(savingsKm * 100) / 100,
            co2SavedKg
        };
    },

    /**
     * Performs a 2-opt swap by reversing the segment between index i and j.
     * 
     * @param {Array<number>} tour - The current tour index sequence.
     * @param {number} i - Starting index of segment to reverse.
     * @param {number} j - Ending index of segment to reverse.
     * @returns {Array<number>} The swapped tour index sequence.
     */
    twoOptSwap: (tour, i, j) => {
        const newTour = tour.slice(0, i);
        const reversedSegment = tour.slice(i, j + 1).reverse();
        const endSegment = tour.slice(j + 1);
        return [...newTour, ...reversedSegment, ...endSegment];
    },

    /**
     * Calculates total distance of a given tour sequence based on distance matrix values.
     * 
     * @param {Array<number>} tour - The tour index sequence.
     * @param {Array<Array<number>>} matrix - Distance matrix.
     * @returns {number} The total geometric distance of the tour.
     */
    getTourDistance: (tour, matrix) => {
        let dist = 0;
        for (let i = 0; i < tour.length - 1; i++) {
            dist += matrix[tour[i]][tour[i + 1]];
        }
        return dist;
    },

    /**
     * Standard Haversine formula to compute great-circle distance between two GPS coordinates.
     * 
     * @param {number} lat1 - Latitude of point 1.
     * @param {number} lon1 - Longitude of point 1.
     * @param {number} lat2 - Latitude of point 2.
     * @param {number} lon2 - Longitude of point 2.
     * @returns {number} The distance in kilometers.
     */
    calculateDistance: (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
};

window.RouteOptimizer = RouteOptimizer;
