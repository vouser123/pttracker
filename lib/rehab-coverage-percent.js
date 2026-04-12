// lib/rehab-coverage-percent.js — rehab coverage Formula 1: 7-day density percentage
/**
 * Rehab Coverage — Formula 1: Percent (7-day density).
 * Calculates what fraction of the week each exercise was done,
 * weighted by contribution level and focus group balance.
 */
import { COVERAGE_CONSTANTS } from './rehab-coverage-constants.js';
import { average, groupExercisesByFocus } from './rehab-coverage-math.js';

/**
 * Tier-promoted percent: primary exercises act like HIGH (full 0-100 scale),
 * secondary exercises act like MEDIUM (weighted bonus, capped).
 * Used when no HIGH exercises exist in a capacity bar.
 */
function calculatePercentPromoted(primary_exercises, secondary_exercises, history_7_days) {
  if (primary_exercises.length === 0) return 0;
  let primaryContribution = 0;
  for (const ex of primary_exercises) {
    const days = history_7_days.get(ex.id) || 0;
    primaryContribution += days / 7.0;
  }
  const coverage = primaryContribution / primary_exercises.length;
  let secondaryContribution = 0;
  for (const ex of secondary_exercises) {
    const days = history_7_days.get(ex.id) || 0;
    secondaryContribution += (days / 7.0) * COVERAGE_CONSTANTS.MEDIUM_WEIGHT;
  }
  const secondaryBonus = Math.min(
    (secondaryContribution / primary_exercises.length) * 100,
    COVERAGE_CONSTANTS.MEDIUM_BONUS_CAP,
  );
  return Math.min(coverage * 100 + secondaryBonus, 100);
}

function calculatePercentWithFocuses(high_exercises, medium_exercises, history_7_days) {
  const focusGroups = groupExercisesByFocus(high_exercises);
  const focusPercents = [];
  for (const [, exercises] of focusGroups) {
    let contribution = 0;
    for (const ex of exercises) {
      const days = history_7_days.get(ex.id) || 0;
      contribution += days / 7.0;
    }
    focusPercents.push((contribution / exercises.length) * 100);
  }
  const worst = Math.min(...focusPercents);
  const others = focusPercents.filter((p) => p !== worst);
  const avgOthers = others.length > 0 ? average(others) : worst;
  const base =
    COVERAGE_CONSTANTS.FOCUS_WORST_WEIGHT * worst +
    COVERAGE_CONSTANTS.FOCUS_OTHERS_WEIGHT * avgOthers;
  let mediumContribution = 0;
  for (const ex of medium_exercises) {
    const days = history_7_days.get(ex.id) || 0;
    mediumContribution += (days / 7.0) * COVERAGE_CONSTANTS.MEDIUM_WEIGHT;
  }
  const mediumBonus = Math.min(
    (mediumContribution / high_exercises.length) * 100,
    COVERAGE_CONSTANTS.MEDIUM_BONUS_CAP,
  );
  return Math.min(base + mediumBonus, 100);
}

/**
 * Calculate the 7-day density percentage for a capacity bar.
 * @param {Object} capacityBarData
 * @returns {number} 0-100
 */
export function calculatePercent(capacityBarData) {
  const { high_exercises, medium_exercises, history_7_days, focuses } = capacityBarData;
  if (high_exercises.length === 0) {
    const low = capacityBarData.low_exercises ?? [];
    if (medium_exercises.length > 0) {
      return calculatePercentPromoted(medium_exercises, low, history_7_days);
    }
    return calculatePercentPromoted(low, [], history_7_days);
  }
  if (focuses && focuses.length > 1) {
    return calculatePercentWithFocuses(high_exercises, medium_exercises, history_7_days);
  }
  let highContribution = 0;
  for (const ex of high_exercises) {
    const days = history_7_days.get(ex.id) || 0;
    highContribution += days / 7.0;
  }
  let mediumContribution = 0;
  for (const ex of medium_exercises) {
    const days = history_7_days.get(ex.id) || 0;
    mediumContribution += (days / 7.0) * COVERAGE_CONSTANTS.MEDIUM_WEIGHT;
  }
  const coverage = highContribution / high_exercises.length;
  const mediumBonus = Math.min(
    (mediumContribution / high_exercises.length) * 100,
    COVERAGE_CONSTANTS.MEDIUM_BONUS_CAP,
  );
  return Math.min(coverage * 100 + mediumBonus, 100);
}
