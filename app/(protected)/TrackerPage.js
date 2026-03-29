'use client';
/**
 * app/TrackerPage.js — Tracker logging route host (Client Component).
 * Migrated from pages/index.js. App Router metadata now lives in app/page.js.
 *
 * ORCHESTRATOR ONLY — this file wires auth, tracker state, offline queue,
 * reconnect recovery, history, logger modals, and messaging together.
 */
import dynamic from 'next/dynamic';
import { useMemo, useState, useCallback, useEffect, useRef, useDeferredValue, useTransition } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useIndexData } from '../../hooks/useIndexData';
import { useIndexOfflineQueue } from '../../hooks/useIndexOfflineQueue';
import { useManualLog } from '../../hooks/useManualLog';
import { useTrackerReconnectRecovery } from '../../hooks/useTrackerReconnectRecovery';
import { useTrackerSession } from '../../hooks/useTrackerSession';
import { useSessionLogging } from '../../hooks/useSessionLogging';
import { useLoggerFeedback } from '../../hooks/useLoggerFeedback';
import { useToast } from '../../hooks/useToast';
import { useMessages } from '../../hooks/useMessages';
import { useUserContext } from '../../hooks/useUserContext';
import { useExerciseSortState } from '../../hooks/useExerciseSortState';
import AuthForm from '../../components/AuthForm';
import NavMenu from '../../components/NavMenu';
import HistoryPanel from '../../components/HistoryPanel';
import BottomNav from '../../components/BottomNav';
import ExercisePicker from '../../components/ExercisePicker';
import TimerPanel from '../../components/TimerPanel';
import Toast from '../../components/Toast';
import { getAdherenceBadgeState } from '../../lib/index-history';
import { buildSessionProgress } from '../../lib/index-tracker-session';
import { markTrackerPickerReady } from '../../lib/tracker-performance';
import styles from '../../pages/index.module.css';

const SessionLoggerModal = dynamic(() => import('../../components/SessionLoggerModal'), { loading: () => null });
const NextSetConfirmModal = dynamic(() => import('../../components/NextSetConfirmModal'), { loading: () => null });
const SessionNotesModal = dynamic(() => import('../../components/SessionNotesModal'), { loading: () => null });
const MessagesModal = dynamic(() => import('../../components/MessagesModal'), { loading: () => null });

export default function TrackerPage() {
    const { session, loading: authLoading, signIn } = useAuth();
    const userId = session?.user?.id ?? null;
    const token = session?.access_token ?? null;
    const userCtx = useUserContext(session);
    const trackerPatientId = userCtx.patientId ?? null;
    const [isOnline, setIsOnline] = useState(() => (
        typeof navigator === 'undefined' ? true : navigator.onLine !== false
    ));
    const {
        exercises,
        programs,
        logs,
        loading,
        historyLoading,
        error,
        historyError,
        fromCache,
        reload,
    } = useIndexData(token, trackerPatientId);
    const { pendingCount, enqueue, sync, clearQueue } = useIndexOfflineQueue(userId, token, {
        autoSyncOnReconnect: false,
    });

    const [activeTab, setActiveTab] = useState('exercises');
    const [, startTabTransition] = useTransition();
    const [isMessagesOpen, setIsMessagesOpen] = useState(false);
    const [emailEnabled, setEmailEnabled] = useState(true);

    useEffect(() => {
        if (!userCtx.loading) setEmailEnabled(userCtx.emailEnabled);
    }, [userCtx.emailEnabled, userCtx.loading]);

    const pickerExercises = useMemo(() => {
        if (programs.length === 0) return exercises;
        return programs
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
    }, [exercises, programs]);
    const {
        sortMode,
        setSortMode,
        manualOrderIds,
        setManualOrderIds,
    } = useExerciseSortState(userId, pickerExercises);

    const { showToast, toastMessage, toastType, toastVisible } = useToast();

    const manualOpenRef = useRef(() => {});
    const feedbackRef = useRef({
        showSaveSuccess: () => {},
        speakText: () => {},
        maybeAnnounceAllSetsComplete: () => {},
    });
    const trackerSession = useTrackerSession({
        pickerExercises,
        logs,
        openManualLog: (options) => manualOpenRef.current(options),
        showSaveSuccess: (...args) => feedbackRef.current.showSaveSuccess(...args),
        showToast,
        speakText: (...args) => feedbackRef.current.speakText(...args),
        maybeAnnounceAllSetsComplete: (...args) => feedbackRef.current.maybeAnnounceAllSetsComplete(...args),
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

    const { maybeAnnounceAllSetsComplete, showSaveSuccess, speakText } = useLoggerFeedback(selectedExercise, sessionStartedAt, showToast);
    feedbackRef.current = { showSaveSuccess, speakText, maybeAnnounceAllSetsComplete };
    const manualLog = useManualLog({
        draftSession,
        selectedExercise,
        buildExerciseFormContext,
        setDraftSession,
        setIsTimerOpen,
        setPanelResetToken,
        maybeAnnounceAllSetsComplete,
    });
    manualOpenRef.current = manualLog.openManualLog;

    const logger = useSessionLogging(token, trackerPatientId, reload, enqueue);
    const msgs = useMessages(token, userCtx.profileId);
    const deferredAllLogs = useDeferredValue(allLogs);
    const setActiveTabDeferred = useCallback((nextTab) => {
        startTabTransition(() => {
            setActiveTab(nextTab);
        });
    }, [startTabTransition]);
    const pickerPrograms = useMemo(() => {
        const buildHistoryState = (exerciseId, canonicalName = null) => {
            if (historyLoading && logs.length === 0) {
                return { history_pending: true };
            }
            return getAdherenceBadgeState(deferredAllLogs, exerciseId, canonicalName);
        };

        if (programs.length > 0) {
            return programs.map((program) => ({
                ...program,
                ...buildHistoryState(program.exercise_id, program?.exercises?.canonical_name ?? null),
            }));
        }
        return exercises.map((exercise) => ({
            exercise_id: exercise.id,
            ...buildHistoryState(exercise.id, exercise.canonical_name ?? null),
        }));
    }, [deferredAllLogs, exercises, historyLoading, logs.length, programs]);
    const sessionProgress = useMemo(() => buildSessionProgress(selectedExercise, draftSession?.sets ?? []), [draftSession?.sets, selectedExercise]);

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
        if (didSave) setActiveTabDeferred('exercises');
    }, [handleSaveFinishedSession, setActiveTabDeferred]);

    const handleEditLog = useCallback((log) => {
        const byId = pickerExercises.find((exercise) => exercise.id === log.exercise_id);
        const byName = pickerExercises.find((exercise) => exercise.canonical_name === log.exercise_name);
        const exercise = byId || byName || {
            id: log.exercise_id ?? null,
            canonical_name: log.exercise_name ?? 'Exercise',
            pattern_modifiers: [],
            form_parameters_required: [],
            pattern: null,
            dosage_type: null,
        };
        setActiveExercise({ id: exercise.id, name: exercise.canonical_name || log.exercise_name || '' });
        logger.openEdit(exercise, log);
    }, [logger, pickerExercises, setActiveExercise]);

    useEffect(() => {
        if (!logger.isOpen) setActiveExercise(null);
    }, [logger.isOpen, setActiveExercise]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const syncOnlineState = () => setIsOnline(window.navigator.onLine !== false);
        syncOnlineState();
        window.addEventListener('online', syncOnlineState);
        window.addEventListener('offline', syncOnlineState);

        return () => {
            window.removeEventListener('online', syncOnlineState);
            window.removeEventListener('offline', syncOnlineState);
        };
    }, []);

    const canRefreshOnReconnect = activeTab === 'exercises'
        && !isTimerOpen
        && !manualLog.manualLogState.isOpen
        && !logger.isOpen
        && !notesModalOpen
        && !pendingSetPatch
        && !draftSession;

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
        draftSession
        && backdateEnabled
        && backdateValue
        && Math.abs(new Date(backdateValue).getTime() - new Date(draftSession.date).getTime()) > 120000
    );
    const isSessionLoggerOpen = manualLog.manualLogState.isOpen || logger.isOpen;
    const isConfirmModalOpen = Boolean(pendingSetPatch);
    const isNotesModalOpen = notesModalOpen && Boolean(draftSession);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>PT Tracker</h1>
                <div className={styles.headerActions}>
                    <span
                        className={`${styles.connectivityIndicator} ${isOnline ? '' : styles.connectivityIndicatorOffline}`}
                        role="status"
                        aria-label={isOnline ? 'Online' : 'Offline'}
                        title={isOnline ? 'Online' : 'Offline'}
                    >
                        {isOnline ? '🛜' : '🚫'}
                    </span>
                    <div style={{ position: 'relative' }}>
                        <button className={styles.refreshButton} onPointerUp={() => { setIsMessagesOpen(true); msgs.markModalOpened(); }} aria-label="Open messages">
                            ✉️
                            {msgs.unreadCount > 0 && <span className={styles.messagesBadge}>{msgs.unreadCount}</span>}
                        </button>
                    </div>
                    <NavMenu
                        user={session.user}
                        isAdmin={true}
                        onSignOut={handleSignOut}
                        currentPage="index"
                        actions={[{ action: 'manual-sync', label: 'Sync now' }]}
                        onAction={async (action) => {
                            if (action !== 'manual-sync') return false;
                            const result = await sync();
                            if ((result?.succeeded ?? 0) === 0 && (result?.failed ?? 0) === 0) {
                                showToast('Nothing to sync!', 'success');
                            }
                            return true;
                        }}
                    />
                </div>
            </header>

            {fromCache && !error && (
                <div className={styles.infoBanner} role="status">
                    Using cached data
                </div>
            )}
            {error && <div className={styles.errorBanner} role="alert">{error}</div>}
            {!error && historyError && <div className={styles.infoBanner} role="status">{historyError}</div>}
            <Toast message={toastMessage} type={toastType} visible={toastVisible} />

            <main className={styles.main}>
                {activeTab === 'exercises' && (
                    <ExercisePicker
                        exercises={pickerExercises}
                        programs={pickerPrograms}
                        selectedId={selectedExerciseId}
                        onSelect={handleExerciseSelect}
                        sortMode={sortMode}
                        onSortChange={setSortMode}
                        manualOrderIds={manualOrderIds}
                        onManualOrderChange={setManualOrderIds}
                    />
                )}
                {activeTab === 'history' && (
                    <HistoryPanel
                        logs={allLogs}
                        activeExerciseId={activeExercise?.id ?? null}
                        activeExerciseName={activeExercise?.name ?? null}
                        onClearFilter={() => setActiveExercise(null)}
                        onEditLog={handleEditLog}
                    />
                )}
            </main>

            <BottomNav activeTab={activeTab} onTabChange={setActiveTabDeferred} pendingSync={pendingCount} />

            {isSessionLoggerOpen && (
                <SessionLoggerModal
                    isOpen={isSessionLoggerOpen}
                    isEdit={manualLog.manualLogState.isOpen ? false : logger.isEdit}
                    exercise={manualLog.manualLogState.isOpen ? manualLog.manualLogState.exercise : logger.exercise}
                    title={manualLog.manualLogState.isOpen ? 'Log Set' : null}
                    submitLabel={manualLog.manualLogState.isOpen ? 'Save Set' : null}
                    showPerformedAt={!manualLog.manualLogState.isOpen}
                    showNotes={!manualLog.manualLogState.isOpen}
                    performedAt={manualLog.manualLogState.isOpen ? draftSession?.date ?? new Date().toISOString() : logger.performedAt}
                    notes={manualLog.manualLogState.isOpen ? '' : logger.notes}
                    sets={manualLog.manualLogState.isOpen ? manualLog.manualLogState.sets : logger.sets}
                    submitting={manualLog.manualLogState.isOpen ? false : logger.submitting}
                    error={manualLog.manualLogState.isOpen ? manualLog.manualLogState.error : logger.error}
                    onClose={manualLog.manualLogState.isOpen ? manualLog.handleManualModalClose : logger.close}
                    onPerformedAtChange={manualLog.manualLogState.isOpen ? (() => {}) : logger.setPerformedAt}
                    onNotesChange={manualLog.manualLogState.isOpen ? (() => {}) : logger.setNotes}
                    onAddSet={manualLog.manualLogState.isOpen ? manualLog.handleManualAddSet : logger.addSet}
                    onRemoveSet={manualLog.manualLogState.isOpen ? manualLog.handleManualRemoveSet : logger.removeSet}
                    onSetChange={manualLog.manualLogState.isOpen ? manualLog.updateManualSet : logger.updateSet}
                    onFormParamChange={manualLog.manualLogState.isOpen ? manualLog.updateManualFormParam : logger.updateFormParam}
                    onSubmit={manualLog.manualLogState.isOpen ? manualLog.handleManualModalSubmit : handleHistoryModalSubmit}
                    historicalFormParams={(manualLog.manualLogState.isOpen ? manualLog.manualLogState.exercise : logger.exercise)?.historical_form_params ?? {}}
                />
            )}

            <TimerPanel
                isOpen={isTimerOpen}
                exercise={selectedExercise}
                resetToken={panelResetToken}
                sessionProgress={sessionProgress}
                selectedSide={currentSide}
                onSideChange={setCurrentSide}
                onPrevious={handlePreviousSet}
                onBlockedNextSet={handleBlockedNextSet}
                onClose={handleTimerBack}
                onFinish={handleFinishSession}
                onBack={handleTimerBack}
                onApplySet={handleTimerApplySet}
                onOpenManual={handleTimerOpenManual}
            />

            {isConfirmModalOpen && (
                <NextSetConfirmModal
                    isOpen={isConfirmModalOpen}
                    exercise={selectedExercise}
                    setPatch={pendingSetPatch}
                    submitting={false}
                    error={null}
                    onClose={() => setPendingSetPatch(null)}
                    onEdit={handleEditNextSet}
                    onConfirm={handleConfirmNextSet}
                />
            )}

            {isNotesModalOpen && (
                <SessionNotesModal
                    isOpen={isNotesModalOpen}
                    notes={draftSession?.notes ?? ''}
                    backdateEnabled={backdateEnabled}
                    backdateValue={backdateValue}
                    warningVisible={backdateWarningVisible}
                    onClose={handleNotesModalClose}
                    onCancel={handleCancelSession}
                    onNotesChange={(value) => {
                        setDraftSession((previous) => (previous ? { ...previous, notes: value } : previous));
                    }}
                    onToggleBackdate={handleToggleBackdate}
                    onBackdateChange={setBackdateValue}
                    onSave={handleSaveAndShowHistory}
                />
            )}

            {isMessagesOpen && (
                <MessagesModal
                    isOpen={isMessagesOpen}
                    onClose={() => setIsMessagesOpen(false)}
                    messages={msgs.messages}
                    viewerId={userCtx.profileId}
                    viewerName={userCtx.viewerName}
                    otherName={userCtx.otherName}
                    otherIsTherapist={userCtx.otherIsTherapist}
                    recipientId={userCtx.recipientId}
                    emailEnabled={emailEnabled}
                    onSend={msgs.send}
                    onArchive={msgs.archive}
                    onUnarchive={msgs.unarchive}
                    onRemove={msgs.remove}
                    onMarkRead={msgs.markRead}
                    onEmailToggle={handleEmailToggle}
                    onOpened={msgs.markModalOpened}
                />
            )}
        </div>
    );
}
