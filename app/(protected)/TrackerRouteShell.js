// app/(protected)/TrackerRouteShell.js — render-only tracker shell for header, tabs, banners, and nav
import BottomNav from '../../components/BottomNav';
import ExercisePicker from '../../components/ExercisePicker';
import HistoryPanel from '../../components/HistoryPanel';
import NavMenu from '../../components/NavMenu';
import OfflineQueueBanner from '../../components/OfflineQueueBanner';
import Toast from '../../components/Toast';
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
  historyLogs,
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
}) {
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
            <button
              type="button"
              className={styles.refreshButton}
              onPointerUp={onOpenMessages}
              aria-label="Open messages"
            >
              ✉️
              {unreadCount > 0 && <span className={styles.messagesBadge}>{unreadCount}</span>}
            </button>
          </div>
          <NavMenu
            user={sessionUser}
            isAdmin={true}
            onSignOut={onSignOut}
            currentPage="index"
            actions={[{ action: 'manual-sync', label: 'Sync now' }]}
            onAction={onManualSync}
          />
        </div>
      </header>

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
            logs={historyLogs}
            activeExerciseId={activeExerciseId}
            activeExerciseName={activeExerciseName}
            onClearFilter={onClearHistoryFilter}
            onEditLog={onEditLog}
            historyHasMore={historyHasMore}
            historyLoadingMore={historyLoadingMore}
            onLoadMoreHistory={onLoadMoreHistory}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} pendingSync={pendingCount} />
    </div>
  );
}
