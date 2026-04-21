'use client';
/**
 * app/pt-view/PtViewPage.js — Rehab History Dashboard (Client Component).
 * Migrated from pages/pt-view.js. All logic is identical; <Head> replaced by
 * metadata export in app/pt-view/page.js (App Router pattern).
 *
 * ⚠️  ORCHESTRATOR ONLY — this file wires hooks and components together. Nothing else.
 * Before adding ANY code here, ask: "Is this pure wiring?"
 * If the answer is no → it belongs in a hook, component, or lib file, not this file.
 *
 * Wires:
 *   Auth           → hooks/useAuth.js
 *   User context   → hooks/useUserContext.js
 *   Data bootstrap → hooks/usePtViewData.js
 *   UI state       → hooks/usePtViewUiState.js
 *   Data helpers   → lib/pt-view.js (pure functions)
 *   Messages       → hooks/useMessages.js
 *   UI             → components/MessagesModal.js, components/ExerciseHistoryModal.js,
 *                    components/PtView*.js, app/(protected)/ProtectedPageHeader.js,
 *                    components/AuthForm.js
 *   Styles         → PtViewPage.module.css
 */
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import AuthForm from '../../../components/AuthForm';
import HistoryList from '../../../components/HistoryList';
import PatientNotes from '../../../components/PatientNotes';
import PtViewFiltersPanel from '../../../components/PtViewFiltersPanel';
import PtViewNeedsAttention from '../../../components/PtViewNeedsAttention';
import PtViewSummaryStats from '../../../components/PtViewSummaryStats';
import { useAuth } from '../../../hooks/useAuth';
import { useEffectiveConnectivity } from '../../../hooks/useEffectiveConnectivity';
import { useEmailNotifications } from '../../../hooks/useEmailNotifications';
import { useMessages } from '../../../hooks/useMessages';
import { usePtViewData } from '../../../hooks/usePtViewData';
import { usePtViewUiState } from '../../../hooks/usePtViewUiState';
import { useReferenceData } from '../../../hooks/useReferenceData';
import { useUserContext } from '../../../hooks/useUserContext';
import {
  applyFilters,
  computeSummaryStats,
  findNeedsAttention,
  groupLogsByDate,
  needsAttentionUrgency,
} from '../../../lib/pt-view';
import ProtectedPageHeader from '../ProtectedPageHeader';
import styles from './PtViewPage.module.css';

const MessagesModal = dynamic(() => import('../../../components/MessagesModal'), {
  loading: () => null,
});
const ExerciseHistoryModal = dynamic(() => import('../../../components/ExerciseHistoryModal'), {
  loading: () => null,
});

export default function PtViewPage() {
  const { session, loading: authLoading, signIn, signOut } = useAuth();
  const { effectiveOnline } = useEffectiveConnectivity();

  // User identity and messaging context — shared hook, reusable on any page.
  const userCtx = useUserContext(session);

  // Logs and programs for this patient — waits for patientId from userCtx.
  const { logs, programs, dataError, offlineNotice } = usePtViewData({
    token: session?.access_token ?? null,
    patientId: userCtx.patientId,
  });

  // Reference data for form parameter display metadata (suffix, unit options).
  const { referenceData } = useReferenceData(session?.access_token ?? null);
  const formParameterMetadata = referenceData?.formParameterMetadata ?? {};

  // Email notification toggle — optimistic update with API revert on failure.
  const { emailEnabled, handleEmailToggle } = useEmailNotifications({
    token: session?.access_token ?? null,
    initialEnabled: userCtx.emailEnabled,
    loading: userCtx.loading,
  });

  // Messages compare against sender_id / recipient_id, which use users.id profile values.
  const msgs = useMessages(session?.access_token ?? null, userCtx.profileId);

  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const {
    filters,
    setFilters,
    notesCollapsed,
    filtersExpanded,
    uiStateLoaded,
    processedNotes,
    dismissNote,
    toggleNotesCollapsed,
    toggleFilters,
  } = usePtViewUiState(logs);

  // Modal state
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null); // { name, logs }

  // Derived data
  const filteredLogs = applyFilters(logs, filters);
  const dateGroups = groupLogsByDate(filteredLogs);
  const needsAttention = useMemo(() => {
    return findNeedsAttention(logs, programs).map((item) => ({
      ...item,
      urgency: needsAttentionUrgency(item),
    }));
  }, [logs, programs]);
  const stats = computeSummaryStats(logs);

  function toggleSession(id) {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openExerciseHistory(exerciseId, exerciseName) {
    const exerciseLogs = logs.filter((l) => l.exercise_id === exerciseId);
    setHistoryTarget({ name: exerciseName, logs: exerciseLogs });
  }

  // ── Render ──

  if (authLoading) return <div className={styles.loading}>Loading…</div>;

  if (!session) {
    return <AuthForm onSignIn={signIn} />;
  }

  return (
    <>
      <ProtectedPageHeader
        title="Rehab History"
        isOnline={effectiveOnline}
        unreadCount={msgs.unreadCount}
        onOpenMessages={() => {
          setMessagesOpen(true);
          msgs.markModalOpened();
        }}
        navMenuProps={{
          user: session.user,
          isAdmin: userCtx.userRole !== 'patient',
          onSignOut: signOut,
          currentPage: 'pt_view',
          actions: [],
          onAction: () => {},
        }}
      />

      {dataError && (
        <p style={{ color: 'red', padding: '1rem' }}>Error loading data: {dataError}</p>
      )}
      {offlineNotice && <p className={styles['offline-notice']}>{offlineNotice}</p>}

      {uiStateLoaded ? (
        <PatientNotes
          notes={processedNotes}
          collapsed={notesCollapsed}
          onToggle={toggleNotesCollapsed}
          onDismiss={dismissNote}
        />
      ) : (
        <div className={styles['ui-state-placeholder']} />
      )}

      <PtViewNeedsAttention items={needsAttention} onCardClick={openExerciseHistory} />

      <PtViewSummaryStats stats={stats} />

      {uiStateLoaded ? (
        <PtViewFiltersPanel
          filters={filters}
          programs={programs}
          expanded={filtersExpanded}
          onToggle={toggleFilters}
          onChange={setFilters}
        />
      ) : (
        <div className={styles['ui-state-placeholder']} />
      )}

      <HistoryList
        groups={dateGroups}
        expandedSessions={expandedSessions}
        onToggleSession={toggleSession}
        onExerciseClick={openExerciseHistory}
        formParameterMetadata={formParameterMetadata}
      />

      {messagesOpen && (
        <MessagesModal
          isOpen={messagesOpen}
          onClose={() => setMessagesOpen(false)}
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

      {historyTarget && (
        <ExerciseHistoryModal
          isOpen={true}
          onClose={() => setHistoryTarget(null)}
          exerciseName={historyTarget.name}
          logs={historyTarget.logs}
          formParameterMetadata={formParameterMetadata}
        />
      )}
    </>
  );
}
