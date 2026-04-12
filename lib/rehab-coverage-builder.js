// lib/rehab-coverage-builder.js — rehab coverage data builder (API responses → coverage structure)
/**
 * Rehab Coverage — Data builder.
 * Converts raw API responses (logs, roles) to the full coverage data structure.
 * Pure function — no DOM, no fetch, no side effects.
 */
import { daysBetween } from './date-utils.js';
import { calculateColorScore, colorScoreToRGB } from './rehab-coverage-color.js';
import { calculateOpacity } from './rehab-coverage-opacity.js';
import { calculatePercent } from './rehab-coverage-percent.js';
import { calculateRegionBar } from './rehab-coverage-region.js';

/**
 * @param {Array} logs - from /api/logs
 * @param {Array} roles - from /api/roles (includes exercises via join)
 * @returns {{ coverageData, currentDate, summary }}
 */
export function buildCoverageData(logs, roles) {
  const currentDate = new Date();
  const sevenDaysAgo = new Date(currentDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const twentyOneDaysAgo = new Date(currentDate);
  twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

  // Build exercise history maps
  const history7Days = new Map(); // exerciseId -> unique days active in last 7
  const history21Days = new Map(); // exerciseId -> unique days active in last 21
  const lastDoneDates = new Map(); // exerciseId -> most recent date

  for (const log of logs) {
    const logDate = new Date(log.performed_at);
    const exerciseId = log.exercise_id;
    if (!exerciseId) continue;

    // Track most recent date
    const existingDate = lastDoneDates.get(exerciseId);
    if (!existingDate || logDate > existingDate) {
      lastDoneDates.set(exerciseId, logDate);
    }

    // Count unique days in 7-day window
    if (logDate >= sevenDaysAgo) {
      const dateKey = logDate.toISOString().split('T')[0];
      const key7 = `${exerciseId}_7_${dateKey}`;
      if (!history7Days.has(key7)) {
        history7Days.set(exerciseId, (history7Days.get(exerciseId) || 0) + 1);
        history7Days.set(key7, true);
      }
    }

    // Count unique days in 21-day window
    if (logDate >= twentyOneDaysAgo) {
      const dateKey = logDate.toISOString().split('T')[0];
      const key21 = `${exerciseId}_21_${dateKey}`;
      if (!history21Days.has(key21)) {
        history21Days.set(exerciseId, (history21Days.get(exerciseId) || 0) + 1);
        history21Days.set(key21, true);
      }
    }
  }

  // Build coverage matrix: region → capacity → data
  const coverageData = {};
  for (const role of roles) {
    const region = role.region || 'uncategorized';
    const capacity = role.capacity || 'general';
    const focus = role.focus || null;
    const contribution = role.contribution || 'low';
    const exerciseId = role.exercise_id;
    const exerciseName = role.exercises?.canonical_name || exerciseId;

    if (!coverageData[region]) coverageData[region] = {};
    if (!coverageData[region][capacity]) {
      coverageData[region][capacity] = { exercises: [], focuses: new Set() };
    }

    const lastDoneDate = lastDoneDates.get(exerciseId) || null;
    coverageData[region][capacity].exercises.push({
      id: exerciseId,
      name: exerciseName,
      contribution,
      focus,
      lastDone: lastDoneDate,
      daysSince: lastDoneDate ? daysBetween(lastDoneDate, currentDate) : null,
      days7: history7Days.get(exerciseId) || 0,
      days21: history21Days.get(exerciseId) || 0,
    });
    if (focus) coverageData[region][capacity].focuses.add(focus);
  }

  // Calculate signals for each capacity bar
  for (const region of Object.keys(coverageData)) {
    for (const capacity of Object.keys(coverageData[region])) {
      const capData = coverageData[region][capacity];
      const exercises = capData.exercises;
      const highExercises = exercises.filter((e) => e.contribution === 'high');
      const mediumExercises = exercises.filter((e) => e.contribution === 'medium');
      const lowExercises = exercises.filter((e) => e.contribution === 'low');
      const focuses = Array.from(capData.focuses);

      const capHistory7 = new Map();
      const capHistory21 = new Map();
      const capLastDone = new Map();
      for (const ex of exercises) {
        capHistory7.set(ex.id, ex.days7);
        capHistory21.set(ex.id, ex.days21);
        if (ex.lastDone) capLastDone.set(ex.id, ex.lastDone);
      }

      const barData = {
        high_exercises: highExercises,
        medium_exercises: mediumExercises,
        low_exercises: lowExercises,
        history_7_days: capHistory7,
        history_21_days: capHistory21,
        last_done_dates: capLastDone,
        current_date: currentDate,
        focuses: focuses.length > 1 ? focuses : null,
      };

      capData.percent = calculatePercent(barData);
      capData.color_score = calculateColorScore(barData);
      capData.opacity = calculateOpacity(barData);
      capData.color = colorScoreToRGB(capData.color_score);
    }

    // Region-level aggregate
    const capacityBars = Object.values(coverageData[region]);
    coverageData[region]._regionBar = calculateRegionBar(capacityBars);
  }

  // Summary stats
  const exercisesDone7Days = new Set();
  for (const [key] of history7Days) {
    if (!key.includes('_7_')) exercisesDone7Days.add(key);
  }
  const totalExercises = new Set(roles.map((r) => r.exercise_id)).size;
  const coverage7 =
    totalExercises > 0 ? Math.round((exercisesDone7Days.size / totalExercises) * 100) : 0;

  let mostRecentDate = null;
  for (const [, date] of lastDoneDates) {
    if (!mostRecentDate || date > mostRecentDate) mostRecentDate = date;
  }

  let totalOpacity = 0,
    regionCount = 0;
  for (const region of Object.keys(coverageData)) {
    const regionBar = coverageData[region]._regionBar;
    if (regionBar && typeof regionBar.opacity === 'number') {
      totalOpacity += regionBar.opacity;
      regionCount++;
    }
  }
  const avgOpacity = regionCount > 0 ? Math.round(totalOpacity / regionCount) : 0;

  return {
    coverageData,
    currentDate,
    summary: {
      lastDoneAgo: mostRecentDate ? daysBetween(mostRecentDate, currentDate) : null,
      coverage7,
      exercisesDone7: exercisesDone7Days.size,
      totalExercises,
      avgOpacity,
    },
  };
}
