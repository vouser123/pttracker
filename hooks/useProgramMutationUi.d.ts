import type { ProgramMutationUiLike } from './program-route-types';

export function useProgramMutationUi(params: {
  handleSaved: (...args: unknown[]) => Promise<unknown>;
  handleAddRoleMutation: (...args: unknown[]) => Promise<unknown>;
  handleDeleteRoleMutation: (...args: unknown[]) => Promise<unknown>;
  handleAddVocabTermMutation: (...args: unknown[]) => Promise<unknown>;
  handleUpdateVocabTermMutation: (...args: unknown[]) => Promise<unknown>;
  handleDeleteVocabTermMutation: (...args: unknown[]) => Promise<unknown>;
  setRoleExerciseId: (value: string) => void;
  setDosageExerciseId: (value: string) => void;
}): ProgramMutationUiLike;
