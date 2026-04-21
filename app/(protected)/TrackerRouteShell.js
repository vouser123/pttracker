// app/(protected)/TrackerRouteShell.js — render-only tracker shell for header, tabs, banners, and nav
import BottomNav from '../../components/BottomNav';
import ExercisePicker from '../../components/ExercisePicker';
import HistoryPanel from '../../components/HistoryPanel';
import OfflineQueueBanner from '../../components/OfflineQueueBanner';
import Toast from '../../components/Toast';
import ProtectedPageHeader from './ProtectedPageHeader';
import styles from './TrackerPage.module.css';

export default function TrackerRouteShell({
  isOnline,
  unreadCount,
  onOpenMessages,
  sessionUser,
  onSignOut,
  onManualSync,
  fromCache,
  error,
  historyError,
  toastMessage,
  toastType,
  toastVisible,
  activeTab,
  pickerModel,
  selectedExerciseId,
  onSelectExercise,
  onEditDosage,
  canEditDosage,
  sortMode,
  onSortChange,
  lifecycleFilter,
  onLifecycleFilterChange,
  historyGroups,
  activeExerciseId,
  activeExerciseName,
  onClearHistoryFilter,
  onEditLog,
  historyHasMore,
  historyLoadingMore,
  onLoadMoreHistory,
  onTabChange,
  pendingCount,
  offlinePendingCount,
  offlineSyncing,
  offlineQueueLoaded,
  offlineQueueError,
  formParameterMetadata = {},
}) {
  return (
    <div className={styles.page}>
      <ProtectedPageHeader
        title="PT Tracker"
        isOnline={isOnline}
        unreadCount={unreadCount}
        onOpenMessages={onOpenMessages}
        navMenuProps={{
          user: sessionUser,
          isAdmin: true,
          onSignOut,
          currentPage: 'index',
          actions: [{ action: 'manual-sync', label: 'Sync now' }],
          onAction: onManualSync,
        }}
      />

      {fromCache && !error && (
        <div className={styles.infoBanner} role="status">
          Using cached data
        </div>
      )}
      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}
      {!error && historyError && (
        <div className={styles.infoBanner} role="status">
          {historyError}
        </div>
      )}
      <OfflineQueueBanner
        pendingCount={offlinePendingCount}
        syncing={offlineSyncing}
        queueLoaded={offlineQueueLoaded}
        queueError={offlineQueueError}
        label="change"
      />
      <Toast message={toastMessage} type={toastType} visible={toastVisible} />

      <main className={styles.main}>
        {activeTab === 'exercises' && (
          <ExercisePicker
            pickerModel={pickerModel}
            selectedId={selectedExerciseId}
            onSelect={onSelectExercise}
            onEditDosage={onEditDosage}
            canEditDosage={canEditDosage}
            sortMode={sortMode}
            onSortChange={onSortChange}
            lifecycleFilter={lifecycleFilter}
            onLifecycleFilterChange={onLifecycleFilterChange}
          />
        )}
        {activeTab === 'history' && (
          <HistoryPanel
            groups={historyGroups}
            activeExerciseId={activeExerciseId}
            activeExerciseName={activeExerciseName}
            onClearFilter={onClearHistoryFilter}
            onEditLog={onEditLog}
            historyHasMore={historyHasMore}
            historyLoadingMore={historyLoadingMore}
            onLoadMoreHistory={onLoadMoreHistory}
            formParameterMetadata={formParameterMetadata}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} pendingSync={pendingCount} />
    </div>
  );
}
