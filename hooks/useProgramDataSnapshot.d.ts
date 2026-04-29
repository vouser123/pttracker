import type { ProgramDataSnapshotHookLike, ProgramSnapshotLike } from './program-route-types';

export function useProgramDataSnapshot(params: {
  setProgramDataSnapshot: (snapshot: ProgramSnapshotLike) => void;
}): ProgramDataSnapshotHookLike;
