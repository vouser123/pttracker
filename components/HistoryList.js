// components/HistoryList.js — session history grouped by date, virtualized with react-virtuoso.
'use client';
// 'use client' is a no-op in Pages Router; marks this as a Client Component in App Router.

import { GroupedVirtuoso } from 'react-virtuoso';
import styles from './HistoryList.module.css';

/** Format a form_data entry value using stored unit and saved display suffix from metadata. */
function formatParamValue(f, metadata) {
  const value = f?.parameter_value;
  if (!value) return null;
  if (f.parameter_unit) return `${value} ${f.parameter_unit}`;
  const suffix = metadata?.[f.parameter_name]?.display_suffix;
  return suffix ? `${value} ${suffix}` : value;
}

/** Format a log's sets into a compact summary string. Includes form_data parameter values with units and display suffixes. */
function summarizeSets(sets, formParameterMetadata) {
  if (!sets?.length) return '';
  return sets
    .map((s) =>
      [
        s.reps && `${s.reps} reps`,
        s.seconds && `${s.seconds}s`,
        s.distance_feet && `${s.distance_feet} ft`,
        s.side,
        ...(s.form_data ?? [])
          .map((f) => formatParamValue(f, formParameterMetadata))
          .filter(Boolean),
      ]
        .filter(Boolean)
        .join(' · '),
    )
    .join(' | ');
}

/**
 * History list grouped by date with expandable session cards.
 * Virtualized with react-virtuoso — only visible items are rendered.
 * Handles 400+ log sessions without scroll jank; scales to 2000+ as PT volume grows.
 * All data is pre-filtered and grouped by the parent (via groupLogsByDate + applyFilters).
 *
 * @param {Array}    groups           - Log groups: [{ dateKey, displayDate, logs }]
 * @param {Set}      expandedSessions - Set of log ids currently expanded
 * @param {Function} onToggleSession  - Toggle a session's expanded state by log id
 * @param {Function} onExerciseClick  - Open exercise history modal (exerciseId, exerciseName)
 * @param {Function} onEditLog        - Open edit logger modal for a specific log
 */
export default function HistoryList({
  groups,
  expandedSessions,
  onToggleSession,
  onExerciseClick,
  onEditLog,
  formParameterMetadata = {},
}) {
  if (groups.length === 0) return <div className={styles['empty-state']}>No history to show.</div>;

  const groupCounts = groups.map((g) => g.logs.length);
  const flatLogs = groups.flatMap((g) => g.logs);

  return (
    <div className={styles['history-section']}>
      <GroupedVirtuoso
        useWindowScroll
        groupCounts={groupCounts}
        groupContent={(groupIndex) => {
          const { displayDate, logs } = groups[groupIndex];
          return (
            <div className={styles['date-group-header']}>
              {displayDate} — {logs.length} session{logs.length !== 1 ? 's' : ''}
            </div>
          );
        }}
        itemContent={(index) => {
          const log = flatLogs[index];
          const isExpanded = expandedSessions.has(log.id);
          return (
            <div
              className={`${styles['session-card']}${log.notes ? ` ${styles['has-notes']}` : ''}${isExpanded ? ` ${styles.expanded}` : ''}`}
              onPointerUp={() => onToggleSession(log.id)}
            >
              <div className={styles['session-card-compact']}>
                <div className={styles['session-time-col']}>
                  {new Date(log.performed_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
                <div className={styles['session-main-col']}>
                  <div
                    className={styles['session-exercise']}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      onExerciseClick(log.exercise_id, log.exercise_name);
                    }}
                  >
                    {log.exercise_name}
                  </div>
                  <div className={styles['session-sets-summary']}>
                    {summarizeSets(log.sets, formParameterMetadata)}
                  </div>
                  {log.notes && <div className={styles['session-notes-inline']}>{log.notes}</div>}
                </div>
              </div>
              {isExpanded && (
                <div className={styles['session-expanded-content']}>
                  <div className={styles['session-sets']}>
                    {log.sets?.map((s) => (
                      <div key={s.set_number} className={styles['set-item']}>
                        Set {s.set_number}
                        {s.reps && ` · ${s.reps} reps`}
                        {s.seconds && ` · ${s.seconds}s`}
                        {s.distance_feet && ` · ${s.distance_feet} ft`}
                        {s.side && ` · ${s.side}`}
                        {(s.form_data ?? []).map((f) => {
                          const v = formatParamValue(f, formParameterMetadata);
                          return v ? ` · ${v}` : null;
                        })}
                      </div>
                    ))}
                  </div>
                  {onEditLog && (
                    <div className={styles['session-actions']}>
                      <button
                        type="button"
                        className={styles['edit-btn']}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          onEditLog(log);
                        }}
                      >
                        Edit Session
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
