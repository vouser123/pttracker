// lib/rehab-coverage-region.js — rehab coverage region bar aggregation
/**
 * Rehab Coverage — Region bar aggregation.
 * Aggregates capacity bars into a single region bar using weighted average.
 * Weight = (count of HIGH exercises) ^ REGION_WEIGHT_EXPONENT.
 */
import { COVERAGE_CONSTANTS } from './rehab-coverage-constants.js';
import { weightedAverage } from './rehab-coverage-math.js';

/**
 * @param {Array} capacityBars
 * @returns {{ percent, color_score, opacity }}
 */
export function calculateRegionBar(capacityBars) {
  const weights = capacityBars.map((cap) => {
    const highCount = cap.exercises.filter((e) => e.contribution === 'high').length;
    return highCount ** COVERAGE_CONSTANTS.REGION_WEIGHT_EXPONENT;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    return { percent: 0, color_score: 0, opacity: 20 };
  }
  return {
    percent: Math.round(
      weightedAverage(
        capacityBars.map((c) => c.percent),
        weights,
      ),
    ),
    color_score: Math.round(
      weightedAverage(
        capacityBars.map((c) => c.color_score),
        weights,
      ),
    ),
    opacity: Math.round(
      weightedAverage(
        capacityBars.map((c) => c.opacity),
        weights,
      ),
    ),
  };
}
