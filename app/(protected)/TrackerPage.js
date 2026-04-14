'use client';
/**
 * app/TrackerPage.js — Tracker logging route host (Client Component).
 * Migrated from pages/index.js. App Router metadata now lives in app/page.js.
 *
 * ORCHESTRATOR ONLY — this file wires auth, tracker state, offline queue,
 * reconnect recovery, history, logger modals, and messaging together.
 */
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AuthForm from '../../components/AuthForm';
import { useAuth } from '../../hooks/useAuth';
import { useEffectiveConnectivity } from '../../hooks/useEffectiveConnectivity';
import { useExercisePickerModel } from '../../hooks/useExercisePickerModel';
import { useExerciseSortState } from '../../hooks/useExerciseSortState';
import { useIndexData } from '../../hooks/useIndexData';
import { useIndexOfflineQueue } from '../../hooks/useIndexOfflineQueue';
import { useLoggerFeedback } from '../../hooks/useLoggerFeedback';
import { useManualLog } from '../../hooks/useManualLog';
import { useMessages } from '../../hooks/useMessages';
import { useSessionLogging } from '../../hooks/useSessionLogging';
import { useToast } from '../../hooks/useToast';
import { useTrackerDosageEditor } from '../../hooks/useTrackerDosageEditor';
import { useTrackerPrnVisibility } from '../../hooks/useTrackerPrnVisibility';
import { useTrackerReconnectRecovery } from '../../hooks/useTrackerReconnectRecovery';
import { useTrackerSession } from '../../hooks/useTrackerSession';
import { useUserContext } from '../../hooks/useUserContext';
import { getAdherenceBadgeState } from '../../lib/index-history';
import { buildSessionProgress } from '../../lib/index-tracker-session';
import { markTrackerPickerReady } from '../../lib/tracker-performance';
import TrackerOverlays from './TrackerOverlays';
import TrackerRouteShell from './TrackerRouteShell';

export default function TrackerPage() {
  const { session, loading: authLoading, signIn } = useAuth();
  const userId = session?.user?.id ?? null;
  const token = session?.access_token ?? null;
  const userCtx = useUserContext(session);
  const trackerPatientId = userCtx.patientId ?? null;
  const { effectiveOnline } = useEffectiveConnectivity();
  const {
    exercises,
    programs,
    logs,
    loading,
    historyLoading,
    historyLoadingMore,
    historyHasMore,
    error,
    historyError,
    loadMoreHistory,
    fromCache,
    reload,
  } = useIndexData(token, trackerPatientId);
  const { pendingCount, syncing, queueLoaded, queueError, enqueue, sync, clearQueue } =
    useIndexOfflineQueue(userId, token, {
      autoSyncOnReconnect: false,
    });

  const [activeTab, setActiveTab] = useState('exercises');
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const { showToast, toastMessage, toastType, toastVisible } = useToast();

  useEffect(() => {
    if (!userCtx.loading) setEmailEnabled(userCtx.emailEnabled);
  }, [userCtx.emailEnabled, userCtx.loading]);

  const {
    canEditDosage,
    dosageTarget,
    programsForTracker,
    mutationQueue,
    dosageSyncing,
    dosageQueueError,
    openDosageEditor,
    closeDosageEditor,
    saveDosage,
  } = useTrackerDosageEditor({
    session,
    userRole: userCtx.userRole,
    trackerPatientId,
    exercises,
    programs,
    reload,
    showToast,
  });

  const pickerExercises = useMemo(() => {
    if (programsForTracker.length === 0) return exercises;
    return programsForTracker
      .map((program) => {
        const exercise = program.exercises || {};
        return {
          ...exercise,
          id: exercise.id || program.exercise_id,
          current_sets: program.current_sets ?? program.sets,
          current_reps: program.current_reps ?? program.reps_per_set,
          seconds_per_rep: program.seconds_per_rep ?? null,
          seconds_per_set: program.seconds_per_set ?? null,
          dosage_type: program.dosage_type ?? null,
          distance_feet: program.distance_feet ?? null,
        };
      })
      .filter((exercise) => Boolean(exercise.id));
  }, [exercises, programsForTracker]);
  const { sortMode, setSortMode, manualOrderIds, setManualOrderIds } = useExerciseSortState(
    userId,
    pickerExercises,
  );
  const { lifecycleFilter, setLifecycleFilter } = useTrackerPrnVisibility(userId);

  const manualOpenRef = useRef(() => {});
  const feedbackRef = useRef({
    announceSessionProgress: () => {},
    showSaveSuccess: () => {},
  });
  const trackerSession = useTrackerSession({
    pickerExercises,
    logs,
    openManualLog: (options) => manualOpenRef.current(options),
    showSaveSuccess: (...args) => feedbackRef.current.showSaveSuccess(...args),
    showToast,
    announceSessionProgress: (...args) => feedbackRef.current.announceSessionProgress(...args),
    enqueue,
    sync,
    reload,
  });
  const {
    selectedExerciseId,
    selectedExercise,
    draftSession,
    isTimerOpen,
    panelResetToken,
    pendingSetPatch,
    notesModalOpen,
    backdateEnabled,
    backdateValue,
    allLogs,
    activeExercise,
    sessionStartedAt,
    currentSide,
    setDraftSession,
    setPendingSetPatch,
    setBackdateValue,
    setActiveExercise,
    setIsTimerOpen,
    setPanelResetToken,
    setCurrentSide,
    handleExerciseSelect,
    handleTimerBack,
    handleFinishSession,
    handleNotesModalClose,
    handleCancelSession,
    handleToggleBackdate,
    handleTimerApplySet,
    handleTimerOpenManual,
    handleConfirmNextSet,
    handleEditNextSet,
    handleSaveFinishedSession,
    handlePreviousSet,
    handleBlockedNextSet,
    buildExerciseFormContext,
  } = trackerSession;

  const { announceSessionProgress, showSaveSuccess } = useLoggerFeedback(
    selectedExercise,
    sessionStartedAt,
    showToast,
  );
  feedbackRef.current = { announceSessionProgress, showSaveSuccess };
  const manualLog = useManualLog({
    draftSession,
    selectedExercise,
    allLogs,
    buildExerciseFormContext,
    setDraftSession,
    setIsTimerOpen,
    setPanelResetToken,
    announceSessionProgress,
  });
  manualOpenRef.current = manualLog.openManualLog;

  const logger = useSessionLogging(token, trackerPatientId, reload, enqueue);
  const msgs = useMessages(token, userCtx.profileId);
  const deferredLogs = useDeferredValue(allLogs);
  const pickerPrograms = useMemo(() => {
    const buildHistoryState = (exerciseId, canonicalName = null) => {
      if (historyLoading && logs.length === 0) {
        return { history_pending: true };
      }
      return getAdherenceBadgeState(deferredLogs, exerciseId, canonicalName);
    };

    if (programsForTracker.length > 0) {
      return programsForTracker.map((program) => ({
        ...program,
        ...buildHistoryState(program.exercise_id, program?.exercises?.canonical_name ?? null),
      }));
    }
    return exercises.map((exercise) => ({
      exercise_id: exercise.id,
      ...buildHistoryState(exercise.id, exercise.canonical_name ?? null),
    }));
  }, [deferredLogs, exercises, historyLoading, logs.length, programsForTracker]);
  const pickerModel = useExercisePickerModel({
    exercises: pickerExercises,
    programs: pickerPrograms,
    sortMode,
    lifecycleFilter,
    manualOrderIds,
    onManualOrderChange: setManualOrderIds,
  });
  const sessionProgress = useMemo(
    () => buildSessionProgress(selectedExercise, draftSession?.sets ?? []),
    [draftSession?.sets, selectedExercise],
  );

  useEffect(() => {
    if (loading) return;
    if (pickerExercises.length === 0) return;

    const frameId = window.requestAnimationFrame(() => {
      markTrackerPickerReady();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [loading, pickerExercises.length]);

  const handleHistoryModalSubmit = useCallback(async () => {
    const didSave = await logger.submit();
    if (didSave) showSaveSuccess(logger.notes);
  }, [logger, showSaveSuccess]);

  const handleSaveAndShowHistory = useCallback(() => {
    const didSave = handleSaveFinishedSession();
    if (didSave) setActiveTab('exercises');
  }, [handleSaveFinishedSession]);

  const handleEditLog = useCallback(
    (log) => {
      const byId = pickerExercises.find((exercise) => exercise.id === log.exercise_id);
      const byName = pickerExercises.find(
        (exercise) => exercise.canonical_name === log.exercise_name,
      );
      const exercise = byId ||
        byName || {
          id: log.exercise_id ?? null,
          canonical_name: log.exercise_name ?? 'Exercise',
          pattern_modifiers: [],
          form_parameters_required: [],
          pattern: null,
          dosage_type: null,
        };
      const initialSide =
        exercise.pattern === 'side' ? (log?.sets?.find((set) => set?.side)?.side ?? 'right') : null;
      const exerciseWithContext = buildExerciseFormContext(exercise, initialSide) ?? exercise;
      setActiveExercise({
        id: exerciseWithContext.id,
        name: exerciseWithContext.canonical_name || log.exercise_name || '',
      });
      logger.openEdit(exerciseWithContext, log);
    },
    [buildExerciseFormContext, logger, pickerExercises, setActiveExercise],
  );

  useEffect(() => {
    if (!logger.isOpen) setActiveExercise(null);
  }, [logger.isOpen, setActiveExercise]);

  const canRefreshOnReconnect =
    activeTab === 'exercises' &&
    !isTimerOpen &&
    !manualLog.manualLogState.isOpen &&
    !logger.isOpen &&
    !notesModalOpen &&
    !pendingSetPatch &&
    !draftSession;

  useTrackerReconnectRecovery({
    enabled: Boolean(session && token && trackerPatientId),
    canRefreshNow: canRefreshOnReconnect,
    sync,
    reload,
  });

  const handleSignOut = useCallback(async () => {
    clearQueue();
    const { supabase } = await import('../../lib/supabase');
    await supabase.auth.signOut();
  }, [clearQueue]);

  async function handleEmailToggle(enabled) {
    setEmailEnabled(enabled);
    try {
      const { patchEmailNotifications } = await import('../../lib/users');
      await patchEmailNotifications(token, enabled);
    } catch (err) {
      console.error('emailToggle:', err);
      setEmailEnabled(!enabled);
    }
  }

  if (authLoading) return null;
  if (!session) return <AuthForm onSignIn={signIn} />;

  const backdateWarningVisible = Boolean(
    draftSession &&
      backdateEnabled &&
      backdateValue &&
      Math.abs(new Date(backdateValue).getTime() - new Date(draftSession.date).getTime()) > 120000,
  );
  const isSessionLoggerOpen = manualLog.manualLogState.isOpen || logger.isOpen;
  const isConfirmModalOpen = Boolean(pendingSetPatch);
  const isNotesModalOpen = notesModalOpen && Boolean(draftSession);
  const handleOpenMessages = () => {
    setIsMessagesOpen(true);
    msgs.markModalOpened();
  };
  const handleManualSyncAction = async (action) => {
    if (action !== 'manual-sync') return false;
    const result = await sync();
    if ((result?.succeeded ?? 0) === 0 && (result?.failed ?? 0) === 0) {
      showToast('Nothing to sync!', 'success');
    }
    return true;
  };
  const handleTabChange = (nextTab) => {
    startTransition(() => {
      setActiveTab(nextTab);
    });
  };

  return (
    <>
      <TrackerRouteShell
        isOnline={effectiveOnline}
        unreadCount={msgs.unreadCount}
        onOpenMessages={handleOpenMessages}
        sessionUser={session.user}
        onSignOut={handleSignOut}
        onManualSync={handleManualSyncAction}
        fromCache={fromCache}
        error={error}
        historyError={historyError}
        toastMessage={toastMessage}
        toastType={toastType}
        toastVisible={toastVisible}
        activeTab={activeTab}
        pickerModel={pickerModel}
        selectedExerciseId={selectedExerciseId}
        onSelectExercise={handleExerciseSelect}
        onEditDosage={openDosageEditor}
        canEditDosage={canEditDosage}
        sortMode={sortMode}
        onSortChange={setSortMode}
        lifecycleFilter={lifecycleFilter}
        onLifecycleFilterChange={setLifecycleFilter}
        historyLogs={allLogs}
        activeExerciseId={activeExercise?.id ?? null}
        activeExerciseName={activeExercise?.name ?? null}
        onClearHistoryFilter={() => setActiveExercise(null)}
        onEditLog={handleEditLog}
        historyHasMore={historyHasMore}
        historyLoadingMore={historyLoadingMore}
        onLoadMoreHistory={loadMoreHistory}
        onTabChange={handleTabChange}
        pendingCount={pendingCount}
        offlinePendingCount={pendingCount + mutationQueue.length}
        offlineSyncing={syncing || dosageSyncing}
        offlineQueueLoaded={queueLoaded}
        offlineQueueError={queueError || dosageQueueError}
      />
      <TrackerOverlays
        isSessionLoggerOpen={isSessionLoggerOpen}
        manualLogState={manualLog.manualLogState}
        logger={logger}
        draftSession={draftSession}
        handleHistoryModalSubmit={handleHistoryModalSubmit}
        manualLog={manualLog}
        isTimerOpen={isTimerOpen}
        selectedExercise={selectedExercise}
        panelResetToken={panelResetToken}
        sessionProgress={sessionProgress}
        currentSide={currentSide}
        setCurrentSide={setCurrentSide}
        handlePreviousSet={handlePreviousSet}
        handleBlockedNextSet={handleBlockedNextSet}
        handleTimerBack={handleTimerBack}
        handleFinishSession={handleFinishSession}
        handleTimerApplySet={handleTimerApplySet}
        handleTimerOpenManual={handleTimerOpenManual}
        isConfirmModalOpen={isConfirmModalOpen}
        pendingSetPatch={pendingSetPatch}
        setPendingSetPatch={setPendingSetPatch}
        handleEditNextSet={handleEditNextSet}
        handleConfirmNextSet={handleConfirmNextSet}
        isNotesModalOpen={isNotesModalOpen}
        backdateEnabled={backdateEnabled}
        backdateValue={backdateValue}
        backdateWarningVisible={backdateWarningVisible}
        handleNotesModalClose={handleNotesModalClose}
        handleCancelSession={handleCancelSession}
        setDraftSession={setDraftSession}
        handleToggleBackdate={handleToggleBackdate}
        setBackdateValue={setBackdateValue}
        handleSaveAndShowHistory={handleSaveAndShowHistory}
        isMessagesOpen={isMessagesOpen}
        setIsMessagesOpen={setIsMessagesOpen}
        msgs={msgs}
        userCtx={userCtx}
        emailEnabled={emailEnabled}
        handleEmailToggle={handleEmailToggle}
        dosageTarget={dosageTarget}
        saveDosage={saveDosage}
        closeDosageEditor={closeDosageEditor}
      />
    </>
  );
}
