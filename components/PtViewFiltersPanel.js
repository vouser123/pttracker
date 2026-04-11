// components/PtViewFiltersPanel.js — page-only filters panel for the rehab history route
'use client';
import NativeSelect from './NativeSelect';
import styles from './PtViewFiltersPanel.module.css';

export default function PtViewFiltersPanel({ filters, programs, expanded, onToggle, onChange }) {
  const fieldIds = {
    exercise: 'pt-view-filter-exercise',
    dateFrom: 'pt-view-filter-date-from',
    dateTo: 'pt-view-filter-date-to',
    search: 'pt-view-filter-search',
  };
  return (
    <div className={styles['filters-section']}>
      <div className={styles['filters-toggle']} onPointerUp={onToggle}>
        {expanded ? 'Hide filters' : 'Show filters'}
      </div>
      {expanded && (
        <div className={styles['filters-content']}>
          <div className={styles['filter-group']}>
            <label htmlFor={fieldIds.exercise}>Exercise</label>
            <NativeSelect
              id={fieldIds.exercise}
              value={filters.exercise}
              onChange={(value) => onChange({ ...filters, exercise: value })}
              placeholder="All exercises"
              options={programs.map((program) => ({
                value: program.exercise_id,
                label: program.exercise_name,
              }))}
            />
          </div>
          <div className={styles['filter-group']}>
            <p>Date range</p>
            <div className={styles['date-range']}>
              <input
                id={fieldIds.dateFrom}
                type="date"
                value={filters.dateFrom}
                onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
              />
              <input
                id={fieldIds.dateTo}
                type="date"
                value={filters.dateTo}
                onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
              />
            </div>
          </div>
          <div className={styles['filter-group']}>
            <label htmlFor={fieldIds.search}>Search</label>
            <input
              id={fieldIds.search}
              type="text"
              placeholder="Exercise name or notes…"
              value={filters.query}
              onChange={(event) => onChange({ ...filters, query: event.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
