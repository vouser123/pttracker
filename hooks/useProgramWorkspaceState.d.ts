import type { ProgramExerciseLike, ProgramWorkspaceStateLike } from './program-route-types';

export function useProgramWorkspaceState(params: {
  exercises: ProgramExerciseLike[];
  programs: Record<string, unknown>;
  enabled: boolean;
}): ProgramWorkspaceStateLike;
