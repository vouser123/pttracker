import type {
  AuthSessionLike,
  ProgramSnapshotLike,
  ProgramVocabActionsLike,
} from './program-route-types';

export function useProgramVocabActions(params: {
  session: AuthSessionLike | null;
  enqueueMutation: (...args: unknown[]) => Promise<unknown>;
  getSnapshot: () => ProgramSnapshotLike;
}): ProgramVocabActionsLike;
