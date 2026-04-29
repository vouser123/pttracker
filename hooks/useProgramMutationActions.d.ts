import type {
  AuthSessionLike,
  ProgramExerciseLike,
  ProgramMutationActionsLike,
  ProgramSnapshotLike,
} from './program-route-types';

export function useProgramMutationActions(params: {
  session: AuthSessionLike | null;
  selectedExercise: ProgramExerciseLike | null;
  programPatientId: string | null;
  dosageTarget: {
    exercise: ProgramExerciseLike | null;
    program: unknown;
  } | null;
  mutationQueue: unknown[];
  enqueueMutation: (...args: unknown[]) => Promise<unknown>;
  persistQueue: (nextQueue: unknown[]) => Promise<void>;
  commitSnapshot: (snapshot: ProgramSnapshotLike) => void;
  showToast: (message: string, type?: string, duration?: number) => void;
  getSnapshot: () => ProgramSnapshotLike;
  setDosageTarget: (
    value: {
      exercise: ProgramExerciseLike | null;
      program: unknown;
    } | null,
  ) => void;
}): ProgramMutationActionsLike;
