// hooks/usePtViewUiState.js — manages persisted ui state and note shaping for the rehab history route
import { useEffect, useMemo, useState } from 'react';
import { offlineCache } from '../lib/offline-cache';
import { detectKeywords } from '../lib/pt-view';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHighlightedParts(noteText, keywords) {
  if (!noteText) return [];
  if (!keywords.length) return [{ key: '0', text: noteText, isHighlighted: false }];

  const pattern = keywords
    .slice()
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|');

  if (!pattern) return [{ key: '0', text: noteText, isHighlighted: false }];

  const regex = new RegExp(`(${pattern})`, 'gi');
  const segments = noteText.split(regex).filter(Boolean);
  let offset = 0;

  return segments.map((text) => {
    const key = `${offset}-${text}`;
    offset += text.length;
    return {
      key,
      text,
      isHighlighted: keywords.some((word) => word.toLowerCase() === text.toLowerCase()),
    };
  });
}

export function usePtViewUiState(logs) {
  const [filters, setFilters] = useState({ exercise: '', dateFrom: '', dateTo: '', query: '' });
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [dismissedNotes, setDismissedNotes] = useState([]);
  const [uiStateLoaded, setUiStateLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUiState() {
      try {
        await offlineCache.init();
        const [nextNotesCollapsed, nextFiltersExpanded, nextDismissedNotes] = await Promise.all([
          offlineCache.getUiState('pt_view_notes_collapsed', false),
          offlineCache.getUiState('pt_view_filters_expanded', false),
          offlineCache.getUiState('pt_view_dismissed_notes', []),
        ]);
        if (cancelled) return;
        setNotesCollapsed(Boolean(nextNotesCollapsed));
        setFiltersExpanded(Boolean(nextFiltersExpanded));
        setDismissedNotes(Array.isArray(nextDismissedNotes) ? nextDismissedNotes : []);
        setUiStateLoaded(true);
      } catch {
        if (!cancelled) setUiStateLoaded(true);
      }
    }

    void loadUiState();

    return () => {
      cancelled = true;
    };
  }, []);

  const processedNotes = useMemo(
    () =>
      logs
        .filter((log) => log.notes && !dismissedNotes.includes(log.id))
        .slice(0, 10)
        .map((log) => {
          const keywords = detectKeywords(log.notes);
          const isConcerning = keywords.length > 0;
          const displayParts = buildHighlightedParts(log.notes, keywords);
          return { ...log, isConcerning, displayParts };
        }),
    [dismissedNotes, logs],
  );

  function dismissNote(logId) {
    const next = [...dismissedNotes, logId];
    setDismissedNotes(next);
    void offlineCache.setUiState('pt_view_dismissed_notes', next);
  }

  function toggleNotesCollapsed() {
    const next = !notesCollapsed;
    setNotesCollapsed(next);
    void offlineCache.setUiState('pt_view_notes_collapsed', next);
  }

  function toggleFilters() {
    const next = !filtersExpanded;
    setFiltersExpanded(next);
    void offlineCache.setUiState('pt_view_filters_expanded', next);
  }

  return {
    filters,
    setFilters,
    notesCollapsed,
    filtersExpanded,
    uiStateLoaded,
    processedNotes,
    dismissNote,
    toggleNotesCollapsed,
    toggleFilters,
  };
}
