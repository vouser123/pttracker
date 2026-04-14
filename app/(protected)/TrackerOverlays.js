// app/(protected)/TrackerOverlays.js — render-only tracker overlay stack for logger, timer, notes, messages, and dosage
import dynamic from 'next/dynamic';
import { useTimerSpeech } from '../../hooks/useTimerSpeech';

const SessionLoggerModal = dynamic(() => import('../../components/SessionLoggerModal'), {
  loading: () => null,
});
const NextSetConfirmModal = dynamic(() => import('../../components/NextSetConfirmModal'), {
  loading: () => null,
});
const SessionNotesModal = dynamic(() => import('../../components/SessionNotesModal'), {
  loading: () => null,
});
const MessagesModal = dynamic(() => import('../../components/MessagesModal'), {
  loading: () => null,
});
const DosageModal = dynamic(() => import('../../components/DosageModal'), { loading: () => null });
const TimerPanel = dynamic(() => import('../../components/TimerPanel'), { loading: () => null });

export default function TrackerOverlays({
  isSessionLoggerOpen,
  manualLogState,
  logger,
  draftSession,
  handleHistoryModalSubmit,
  manualLog,
  isTimerOpen,
  selectedExercise,
  panelResetToken,
  sessionProgress,
  currentSide,
  setCurrentSide,
  handlePreviousSet,
  handleBlockedNextSet,
  handleTimerBack,
  handleFinishSession,
  handleTimerApplySet,
  handleTimerOpenManual,
  isConfirmModalOpen,
  pendingSetPatch,
  setPendingSetPatch,
  handleEditNextSet,
  handleConfirmNextSet,
  isNotesModalOpen,
  backdateEnabled,
  backdateValue,
  backdateWarningVisible,
  handleNotesModalClose,
  handleCancelSession,
  setDraftSession,
  handleToggleBackdate,
  setBackdateValue,
  handleSaveAndShowHistory,
  isMessagesOpen,
  setIsMessagesOpen,
  msgs,
  userCtx,
  emailEnabled,
  handleEmailToggle,
  dosageTarget,
  saveDosage,
  closeDosageEditor,
}) {
  return (
    <>
      {isSessionLoggerOpen && (
        <SessionLoggerModal
          isOpen={isSessionLoggerOpen}
          isEdit={manualLogState.isOpen ? false : logger.isEdit}
          exercise={manualLogState.isOpen ? manualLogState.exercise : logger.exercise}
          title={manualLogState.isOpen ? 'Log Set' : null}
          submitLabel={manualLogState.isOpen ? 'Save Set' : null}
          showPerformedAt={!manualLogState.isOpen}
          showNotes={!manualLogState.isOpen}
          performedAt={
            manualLogState.isOpen
              ? (draftSession?.date ?? new Date().toISOString())
              : logger.performedAt
          }
          notes={manualLogState.isOpen ? '' : logger.notes}
          sets={manualLogState.isOpen ? manualLogState.sets : logger.sets}
          submitting={manualLogState.isOpen ? false : logger.submitting}
          error={manualLogState.isOpen ? manualLogState.error : logger.error}
          onClose={manualLogState.isOpen ? manualLog.handleManualModalClose : logger.close}
          onPerformedAtChange={manualLogState.isOpen ? () => {} : logger.setPerformedAt}
          onNotesChange={manualLogState.isOpen ? () => {} : logger.setNotes}
          onAddSet={manualLogState.isOpen ? manualLog.handleManualAddSet : logger.addSet}
          onRemoveSet={manualLogState.isOpen ? manualLog.handleManualRemoveSet : logger.removeSet}
          onSetChange={manualLogState.isOpen ? manualLog.updateManualSet : logger.updateSet}
          onFormParamChange={
            manualLogState.isOpen ? manualLog.updateManualFormParam : logger.updateFormParam
          }
          onSubmit={
            manualLogState.isOpen ? manualLog.handleManualModalSubmit : handleHistoryModalSubmit
          }
          historicalFormParams={
            (manualLogState.isOpen ? manualLogState.exercise : logger.exercise)
              ?.historical_form_params ?? {}
          }
        />
      )}

      <TimerPanelSection
        isOpen={isTimerOpen}
        panelResetToken={panelResetToken}
        selectedExercise={selectedExercise}
        sessionProgress={sessionProgress}
        currentSide={currentSide}
        setCurrentSide={setCurrentSide}
        handlePreviousSet={handlePreviousSet}
        handleBlockedNextSet={handleBlockedNextSet}
        handleTimerBack={handleTimerBack}
        handleFinishSession={handleFinishSession}
        handleTimerApplySet={handleTimerApplySet}
        handleTimerOpenManual={handleTimerOpenManual}
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

      {dosageTarget && (
        <DosageModal
          exercise={dosageTarget.exercise}
          program={dosageTarget.program}
          onSave={saveDosage}
          onClose={closeDosageEditor}
        />
      )}
    </>
  );
}

function TimerPanelSection({
  isOpen,
  panelResetToken,
  selectedExercise,
  sessionProgress,
  currentSide,
  setCurrentSide,
  handlePreviousSet,
  handleBlockedNextSet,
  handleTimerBack,
  handleFinishSession,
  handleTimerApplySet,
  handleTimerOpenManual,
}) {
  const timer = useTimerSpeech(
    selectedExercise,
    isOpen,
    panelResetToken,
    sessionProgress,
    currentSide,
    setCurrentSide,
  );

  return (
    <TimerPanel
      isOpen={isOpen}
      exercise={selectedExercise}
      sessionProgress={sessionProgress}
      timer={timer}
      onPrevious={handlePreviousSet}
      onBlockedNextSet={handleBlockedNextSet}
      onClose={handleTimerBack}
      onFinish={handleFinishSession}
      onBack={handleTimerBack}
      onApplySet={handleTimerApplySet}
      onOpenManual={handleTimerOpenManual}
    />
  );
}
