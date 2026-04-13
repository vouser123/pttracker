// hooks/useSessionLogging.js — session log modal draft orchestration for create/edit flows
import { useCallback, useMemo, useState } from 'react';
import {
  appendDraftSet,
  buildCreateDraft,
  buildEditDraft,
  buildSeededCreateDraft,
  removeDraftSetAtIndex,
  updateDraftFormParamAtIndex,
  updateDraftSetAtIndex,
} from '../lib/session-log-draft';
import { useSeedSetLogging } from './useSeedSetLogging';
import { useSessionLogSubmission } from './useSessionLogSubmission';

export function useSessionLogging(token, patientId, onSaved, onEnqueue) {
  const [isOpen, setIsOpen] = useState(false);
  const [exercise, setExercise] = useState(null);
  const [logId, setLogId] = useState(null);
  const [performedAt, setPerformedAt] = useState(new Date().toISOString());
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = useMemo(() => Boolean(logId), [logId]);

  const close = useCallback(() => {
    setIsOpen(false);
    setExercise(null);
    setLogId(null);
    setNotes('');
    setSets([]);
    setError(null);
  }, []);

  const submit = useSessionLogSubmission({
    token,
    patientId,
    onSaved,
    onEnqueue,
    close,
    setSubmitting,
    setError,
  });
  const submitSeedSet = useSeedSetLogging({
    token,
    patientId,
    onSaved,
    onEnqueue,
    setSubmitting,
    setError,
  });

  const openCreate = useCallback((selectedExercise) => {
    const draft = buildCreateDraft(selectedExercise);

    setExercise(selectedExercise);
    setLogId(draft.logId);
    setPerformedAt(draft.performedAt);
    setNotes(draft.notes);
    setSets(draft.sets);
    setError(null);
    setIsOpen(true);
  }, []);

  const openCreateWithSeedSet = useCallback((selectedExercise, seedPatch) => {
    const draft = buildSeededCreateDraft(selectedExercise, seedPatch);

    setExercise(selectedExercise);
    setLogId(draft.logId);
    setPerformedAt(draft.performedAt);
    setNotes(draft.notes);
    setSets(draft.sets);
    setError(null);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((selectedExercise, log) => {
    const draft = buildEditDraft(selectedExercise, log);

    setExercise(selectedExercise);
    setLogId(draft.logId);
    setPerformedAt(draft.performedAt);
    setNotes(draft.notes);
    setSets(draft.sets);
    setError(null);
    setIsOpen(true);
  }, []);

  const addSet = useCallback(() => {
    setSets((previousSets) => appendDraftSet(previousSets, exercise));
  }, [exercise]);

  const removeSet = useCallback((index) => {
    setSets((previousSets) => removeDraftSetAtIndex(previousSets, index));
  }, []);

  const updateSet = useCallback((index, patch) => {
    setSets((previousSets) => updateDraftSetAtIndex(previousSets, index, patch));
  }, []);

  const updateFormParam = useCallback((index, paramName, paramValue, paramUnit = null) => {
    setSets((previousSets) =>
      updateDraftFormParamAtIndex(previousSets, index, paramName, paramValue, paramUnit),
    );
  }, []);

  return {
    isOpen,
    isEdit,
    exercise,
    performedAt,
    notes,
    sets,
    submitting,
    error,
    openCreate,
    openCreateWithSeedSet,
    openEdit,
    close,
    setPerformedAt,
    setNotes,
    addSet,
    removeSet,
    updateSet,
    updateFormParam,
    submit: () => submit({ exercise, logId, performedAt, notes, sets }),
    submitSeedSet,
  };
}
