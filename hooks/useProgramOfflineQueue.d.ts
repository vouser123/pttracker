import type {
  AuthSessionLike,
  ProgramOfflineQueueHookLike,
  ProgramSnapshotLike,
} from './program-route-types';

export function useProgramOfflineQueue(params: {
  session: AuthSessionLike | null;
  programPatientId: string | null;
  loadData: (
    accessToken: string,
    authUserId: string,
    scopedPatientId: string | null,
  ) => Promise<unknown>;
  showToast: (message: string, type?: string, duration?: number) => void;
  commitSnapshot: (snapshot: ProgramSnapshotLike) => void;
}): ProgramOfflineQueueHookLike;
