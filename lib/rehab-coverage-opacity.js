// lib/rehab-coverage-opacity.js — rehab coverage Formula 3: 21-day trend opacity
/**
 * Rehab Coverage — Formula 3: Opacity (21-day trend).
 * Measures sustained activity over 21 days with slow decay, fast recovery.
 */

import { daysBetween } from './date-utils.js';
import { COVERAGE_CONSTANTS } from './rehab-coverage-constants.js';
import { average, groupExercisesByFocus } from './rehab-coverage-math.js';

function calculateOpacityForMedium(
  medium_exercises,
  history_21_days,
  history_7_days,
  last_done_dates,
  current_date,
) {
  if (medium_exercises.length === 0) return 20;
  let total21 = 0,
    totalRecent = 0,
    minDaysSince = Infinity;
  for (const ex of medium_exercises) {
    total21 += history_21_days.get(ex.id) || 0;
    totalRecent += history_7_days.get(ex.id) || 0;
    const lastDone = last_done_dates.get(ex.id);
    if (lastDone) {
      const daysSince = daysBetween(lastDone, current_date);
      minDaysSince = Math.min(minDaysSince, daysSince);
    }
  }
  const avg21 = total21 / medium_exercises.length;
  const avgRecent = totalRecent / medium_exercises.length;
  let base = Math.min(avg21 / COVERAGE_CONSTANTS.OPACITY_OPTIMAL_DAYS, 1.0) * 100;
  if (minDaysSince >= 14) base *= 0.3;
  else if (minDaysSince >= 10) base *= 0.5;
  else if (minDaysSince >= 7) base *= 0.8;
  if (avgRecent >= 5) base = Math.max(base, 70);
  else if (avgRecent >= 4) base = Math.max(base, 50);
  else if (avgRecent >= 3) base = Math.max(base, 35);
  return Math.round(base);
}

function calculateOpacityWithFocuses(
  high_exercises,
  history_21_days,
  history_7_days,
  last_done_dates,
  current_date,
) {
  const focusGroups = groupExercisesByFocus(high_exercises);
  const focusOpacities = [];
  for (const [, exercises] of focusGroups) {
    let total21 = 0,
      totalRecent = 0,
      minDaysSince = Infinity;
    for (const ex of exercises) {
      total21 += history_21_days.get(ex.id) || 0;
      totalRecent += history_7_days.get(ex.id) || 0;
      const lastDone = last_done_dates.get(ex.id);
      if (lastDone) {
        const daysSince = daysBetween(lastDone, current_date);
        minDaysSince = Math.min(minDaysSince, daysSince);
      }
    }
    const avg21 = total21 / exercises.length;
    const avgRecent = totalRecent / exercises.length;
    let base = Math.min(avg21 / COVERAGE_CONSTANTS.OPACITY_OPTIMAL_DAYS, 1.0) * 100;
    if (minDaysSince >= 14) base *= 0.3;
    else if (minDaysSince >= 10) base *= 0.5;
    else if (minDaysSince >= 7) base *= 0.8;
    if (avgRecent >= 5) base = Math.max(base, 90);
    else if (avgRecent >= 4) base = Math.max(base, 70);
    else if (avgRecent >= 3) base = Math.max(base, 50);
    focusOpacities.push(base);
  }
  const worst = Math.min(...focusOpacities);
  const others = focusOpacities.filter((o) => o !== worst);
  const avgOthers = others.length > 0 ? average(others) : worst;
  return Math.round(
    COVERAGE_CONSTANTS.FOCUS_WORST_WEIGHT * worst +
      COVERAGE_CONSTANTS.FOCUS_OTHERS_WEIGHT * avgOthers,
  );
}

/**
 * Calculate the opacity (0-100) based on 21-day trend with slow decay, fast recovery.
 * @param {Object} capacityBarData
 * @returns {number} 0-100
 */
export function calculateOpacity(capacityBarData) {
  const {
    high_exercises,
    medium_exercises,
    history_21_days,
    history_7_days,
    last_done_dates,
    current_date,
    focuses,
  } = capacityBarData;
  if (high_exercises.length === 0) {
    return calculateOpacityForMedium(
      medium_exercises,
      history_21_days,
      history_7_days,
      last_done_dates,
      current_date,
    );
  }
  if (focuses && focuses.length > 1) {
    return calculateOpacityWithFocuses(
      high_exercises,
      history_21_days,
      history_7_days,
      last_done_dates,
      current_date,
    );
  }
  let total21day = 0;
  for (const ex of high_exercises) {
    total21day += history_21_days.get(ex.id) || 0;
  }
  const avg21day = total21day / high_exercises.length;
  let totalRecent = 0;
  for (const ex of high_exercises) {
    totalRecent += history_7_days.get(ex.id) || 0;
  }
  const avgRecent = totalRecent / high_exercises.length;
  let minDaysSince = Infinity;
  for (const ex of high_exercises) {
    const lastDone = last_done_dates.get(ex.id);
    if (lastDone) {
      const daysSince = daysBetween(lastDone, current_date);
      minDaysSince = Math.min(minDaysSince, daysSince);
    }
  }
  let base = Math.min(avg21day / COVERAGE_CONSTANTS.OPACITY_OPTIMAL_DAYS, 1.0) * 100;
  if (minDaysSince >= 14) {
    base *= 0.3;
  } else if (minDaysSince >= 10) {
    base *= 0.5;
  } else if (minDaysSince >= 7) {
    base *= 0.8;
  }
  if (avgRecent >= COVERAGE_CONSTANTS.RECOVERY_STRONG_MIN) return Math.max(base, 90);
  else if (avgRecent >= COVERAGE_CONSTANTS.RECOVERY_GOOD_MIN) return Math.max(base, 70);
  else if (avgRecent >= COVERAGE_CONSTANTS.RECOVERY_NOTICEABLE_MIN) return Math.max(base, 50);
  return Math.round(base);
}
