// lib/exercise-picker-display.js — pure tracker picker display helpers for adherence and visible-card shaping

import { formatDosageSummary } from './dosage-summary';

export function getExercisePickerAdherence(program) {
  if (program?.history_pending) return null;
  if (program?.adherence_text) {
    const suffix =
      program?.total_sessions > 0
        ? ` · ${program.total_sessions} session${program.total_sessions > 1 ? 's' : ''} total`
        : '';
    return {
      label: `${program.adherence_icon ?? ''}${program.adherence_text}${suffix}`,
      tone: program?.adherence_tone ?? 'gray',
    };
  }
  if (program?.adherence_status === 'done_today') {
    return { label: 'Done today', tone: 'green' };
  }
  if (program?.adherence_status === 'due_soon') {
    return { label: 'Due soon', tone: 'orange' };
  }
  if (program?.adherence_status === 'overdue') return { label: 'Overdue', tone: 'red' };
  if (program?.last_performed_at) {
    return { label: 'Recent activity', tone: 'green' };
  }
  return { label: 'No history', tone: 'gray' };
}

export function buildVisibleExerciseCard(exercise, program, resolvedStatus) {
  const adherence = getExercisePickerAdherence(program);
  return {
    id: exercise.id,
    canonical_name: exercise.canonical_name,
    pt_category: exercise.pt_category ?? '',
    isPrn: resolvedStatus === 'as_needed',
    dosageText: formatDosageSummary(program ?? exercise, {
      exercise,
      emptyLabel: 'No dosage set',
    }),
    dosageActionLabel: program ? 'Edit dosage' : 'Set dosage',
    adherenceLabel: adherence?.label ?? null,
    adherenceTone: adherence?.tone ?? 'gray',
  };
}
