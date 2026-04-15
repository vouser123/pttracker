'use client';
// app/(protected)/program/ProgramBatchSection.js — batch assignment orchestration section
// One concern: wire batch hooks and render ProgramAssignmentWorkspace.
// Lives in app/ (not components/) because it uses hooks.
import ProgramAssignmentWorkspace from '../../../components/ProgramAssignmentWorkspace';
import { useProgramAssignmentSelection } from '../../../hooks/useProgramAssignmentSelection';
import { useProgramBatchAssignActions } from '../../../hooks/useProgramBatchAssignActions';
import { useProgramBatchDateActions } from '../../../hooks/useProgramBatchDateActions';
import { useProgramBatchStatusActions } from '../../../hooks/useProgramBatchStatusActions';
import {
  buildAssignmentStatusOptions,
  enrichExerciseAssignmentRows,
} from '../../../lib/program-status-display';

export default function ProgramBatchSection({
  session,
  exercises,
  programs,
  programPatientId,
  patientName,
  enqueueMutation,
  getSnapshot,
}) {
  const { selectedExerciseIds, toggleExercise, selectAll, clearAll } =
    useProgramAssignmentSelection();

  const { handleBatchAssign } = useProgramBatchAssignActions({
    session,
    programPatientId,
    enqueueMutation,
    getSnapshot,
  });

  const { handleBatchStatusUpdate } = useProgramBatchStatusActions({
    session,
    programPatientId,
    enqueueMutation,
    getSnapshot,
  });
  const { handleBatchDateUpdate } = useProgramBatchDateActions({
    session,
    programPatientId,
    enqueueMutation,
    getSnapshot,
  });

  const exerciseRows = enrichExerciseAssignmentRows(exercises, programs);
  const statusOptions = buildAssignmentStatusOptions();

  return (
    <ProgramAssignmentWorkspace
      exerciseRows={exerciseRows}
      statusOptions={statusOptions}
      patientName={patientName}
      selectedExerciseIds={selectedExerciseIds}
      onToggleExercise={toggleExercise}
      onSelectAll={selectAll}
      onClearAll={clearAll}
      onBatchAssign={handleBatchAssign}
      onBatchStatusUpdate={handleBatchStatusUpdate}
      onBatchDateUpdate={handleBatchDateUpdate}
    />
  );
}
