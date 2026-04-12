// lib/rehab-coverage-math.js — shared math helpers for rehab coverage signal calculations
/**
 * Rehab Coverage — shared math helpers.
 * Used by the three signal files (percent, color, opacity) and region aggregation.
 */

/** @returns {Map<focus, exercise[]>} exercises grouped by focus field */
export function groupExercisesByFocus(exercises) {
  const groups = new Map();
  for (const ex of exercises) {
    const focus = ex.focus || 'general';
    if (!groups.has(focus)) {
      groups.set(focus, []);
    }
    groups.get(focus).push(ex);
  }
  return groups;
}

/** @returns {number} arithmetic mean of array, 0 if empty */
export function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** @returns {number} weighted mean, 0 if total weight is 0 */
export function weightedAverage(values, weights) {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weights[i];
  }
  return sum / totalWeight;
}
