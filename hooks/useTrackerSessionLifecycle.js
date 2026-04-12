// hooks/useTrackerSessionLifecycle.js — finalization lifecycle wiring and optimistic log merge for the active tracker session
import { useMemo } from 'react';
import { useTrackerSessionFinalization } from './useTrackerSessionFinalization';

export function useTrackerSessionLifecycle({
  draftSession,
  selectedExercise,
  logs,
  showSaveSuccess,
  showToast,
  enqueue,
  sync,
  reload,
  abandonDraftSession,
  setActiveExercise,
}) {
  const finalization = useTrackerSessionFinalization({
    draftSession,
    selectedExercise,
    enqueue,
    sync,
    reload,
    showSaveSuccess,
    showToast,
    abandonDraftSession,
    setActiveExercise,
  });

  const allLogs = useMemo(
    () => [...finalization.optimisticLogs, ...logs],
    [finalization.optimisticLogs, logs],
  );

  return {
    ...finalization,
    allLogs,
  };
}
