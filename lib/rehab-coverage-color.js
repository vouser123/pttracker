// lib/rehab-coverage-color.js — rehab coverage Formula 2: recency color score and RGB mapping
/**
 * Rehab Coverage — Formula 2: Color score (recency).
 * Maps days-since-last-done to a 0-100 score, and that score to an RGB color.
 * Higher score = greener = more recent.
 */

import { daysBetween } from './date-utils.js';
import { COVERAGE_CONSTANTS } from './rehab-coverage-constants.js';
import { average, groupExercisesByFocus } from './rehab-coverage-math.js';

/**
 * Convert days-since-last to a 0-100 color score.
 * Thresholds defined in COVERAGE_CONSTANTS.
 */
function daysToColorScore(days) {
  const C = COVERAGE_CONSTANTS;
  if (days === 0) return C.COLOR_SCORE_DAY_0;
  if (days === 1) return C.COLOR_SCORE_DAY_1;
  if (days === 2) return C.COLOR_SCORE_DAY_2;
  if (days === 3) return C.COLOR_SCORE_DAY_3;
  if (days === 4) return C.COLOR_SCORE_DAY_4;
  return Math.max(0, C.COLOR_SCORE_DAY_4 - (days - 4) * C.COLOR_SCORE_DECAY);
}

function calculateColorWithFocuses(high_exercises, last_done_dates, current_date) {
  const focusGroups = groupExercisesByFocus(high_exercises);
  const focusScores = [];
  for (const [, exercises] of focusGroups) {
    let maxDays = 0;
    let hasNeverDone = false;
    for (const ex of exercises) {
      const lastDone = last_done_dates.get(ex.id);
      if (!lastDone) {
        hasNeverDone = true;
        break;
      }
      const daysSince = daysBetween(lastDone, current_date);
      maxDays = Math.max(maxDays, daysSince);
    }
    focusScores.push(hasNeverDone ? 0 : daysToColorScore(maxDays));
  }
  const worst = Math.min(...focusScores);
  const others = focusScores.filter((s) => s !== worst);
  const avgOthers = others.length > 0 ? average(others) : worst;
  return (
    COVERAGE_CONSTANTS.FOCUS_WORST_WEIGHT * worst +
    COVERAGE_CONSTANTS.FOCUS_OTHERS_WEIGHT * avgOthers
  );
}

/**
 * Calculate the color score (0-100) based on recency of most neglected exercise.
 * @param {Object} capacityBarData
 * @returns {number} 0-100
 */
export function calculateColorScore(capacityBarData) {
  const {
    high_exercises,
    medium_exercises,
    low_exercises,
    last_done_dates,
    current_date,
    focuses,
  } = capacityBarData;
  let targetExercises;
  if (high_exercises.length > 0) {
    targetExercises = high_exercises;
  } else if (medium_exercises.length > 0) {
    targetExercises = medium_exercises;
  } else if (low_exercises && low_exercises.length > 0) {
    targetExercises = low_exercises;
  } else {
    return 0;
  }
  if (targetExercises === high_exercises && focuses && focuses.length > 1) {
    return calculateColorWithFocuses(high_exercises, last_done_dates, current_date);
  }
  let maxDaysSince = 0;
  for (const ex of targetExercises) {
    const lastDone = last_done_dates.get(ex.id);
    if (!lastDone) return 0;
    const daysSince = daysBetween(lastDone, current_date);
    maxDaysSince = Math.max(maxDaysSince, daysSince);
  }
  return daysToColorScore(maxDaysSince);
}

/**
 * Convert a 0-100 color score to an RGB color string.
 * 100 = bright green, 50 = yellow, 0 = deep red.
 * @param {number} score
 * @returns {string} e.g. "rgb(132, 204, 129)"
 */
export function colorScoreToRGB(score) {
  if (score >= 85) {
    const t = (score - 85) / 15;
    return `rgb(${Math.round(132 - t * 116)}, ${Math.round(204 + t * 41)}, 129)`;
  } else if (score >= 60) {
    const t = (score - 60) / 25;
    return `rgb(${Math.round(250 - t * 118)}, 204, ${Math.round(21 + t * 108)})`;
  } else if (score >= 35) {
    const t = (score - 35) / 25;
    return `rgb(249, ${Math.round(115 + t * 89)}, 22)`;
  } else if (score >= 15) {
    const t = (score - 15) / 20;
    return `rgb(${Math.round(239 + t * 10)}, ${Math.round(68 + t * 47)}, 22)`;
  } else {
    const t = score / 15;
    return `rgb(${Math.round(185 + t * 54)}, ${Math.round(28 + t * 40)}, ${Math.round(28 - t * 6)})`;
  }
}
