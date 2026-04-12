// lib/rehab-coverage-constants.js — rehab coverage formula thresholds and weights
/**
 * Rehab Coverage — constants.
 * Edit these to adjust formula thresholds and weights.
 * SPECIFICATION: rehab_coverage formulas.md (LOCKED)
 */
export const COVERAGE_CONSTANTS = {
  // Contribution weights
  HIGH_WEIGHT: 1.0,
  MEDIUM_WEIGHT: 0.4,
  MEDIUM_BONUS_CAP: 15, // Max percentage bonus from MEDIUM exercises

  // Opacity (21-day trend) settings
  OPACITY_WINDOW_DAYS: 21,
  OPACITY_OPTIMAL_DAYS: 15, // Days of activity for 100% opacity

  // Decay thresholds (days since last activity)
  DECAY_NONE_MAX: 6, // No decay if <= 6 days
  DECAY_SLIGHT_MAX: 9, // Slight decay (0.8x) if 7-9 days
  DECAY_MODERATE_MAX: 13, // Moderate decay (0.5x) if 10-13 days
  // Heavy decay (0.3x) if >= 14 days

  // Recovery thresholds (7-day activity count)
  RECOVERY_STRONG_MIN: 5, // 90% floor
  RECOVERY_GOOD_MIN: 4, // 70% floor
  RECOVERY_NOTICEABLE_MIN: 3, // 50% floor

  // Focus aggregation weights
  FOCUS_WORST_WEIGHT: 0.6,
  FOCUS_OTHERS_WEIGHT: 0.4,

  // Region bar weight exponent
  REGION_WEIGHT_EXPONENT: 1.3,

  // Color score (recency) - days since last done -> score
  // Higher score = greener (more recent)
  COLOR_SCORE_DAY_0: 100, // Done today
  COLOR_SCORE_DAY_1: 85, // Done yesterday
  COLOR_SCORE_DAY_2: 60, // 2 days ago
  COLOR_SCORE_DAY_3: 35, // 3 days ago
  COLOR_SCORE_DAY_4: 15, // 4 days ago
  COLOR_SCORE_DECAY: 2, // Points lost per day after day 4

  // Recency text thresholds (based on color score)
  RECENCY_RECENT_MIN: 80, // "✓ done recently"
  RECENCY_FEW_DAYS_MIN: 60, // "~ a few days ago"
  RECENCY_STALE_MIN: 40, // "⚠ getting stale"
  RECENCY_OVERDUE_MIN: 20, // "! overdue"
  // Below 20 = "!! very overdue"

  // Trend text thresholds (based on opacity %)
  TREND_STEADY_MIN: 70, // "↑ steady"
  TREND_OK_MIN: 50, // "→ ok"
  TREND_SLIPPING_MIN: 30, // "↓ slipping"
  // Below 30 = "↓↓ low"
};
