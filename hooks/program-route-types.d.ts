export interface AuthSessionLike {
  access_token: string;
  user: {
    id: string;
    [key: string]: unknown;
  };
}

export interface AuthHookResultLike {
  session: AuthSessionLike | null;
  loading: boolean;
  signIn: (...args: unknown[]) => unknown;
  signOut: () => Promise<unknown> | unknown;
}

export interface UserLike {
  id: string;
  auth_id?: string | null;
  role?: string | null;
  therapist_id?: string | null;
  [key: string]: unknown;
}

export interface ProgramExerciseLike {
  id?: string;
  canonical_name?: string;
  [key: string]: unknown;
}

export interface VocabTermLike {
  code?: string;
  definition?: string;
  sort_order?: number;
  active?: boolean;
  [key: string]: unknown;
}

export interface ProgramRecordLike {
  exercise_id?: string;
  [key: string]: unknown;
}

export interface ProgramSnapshotLike {
  exercises: ProgramExerciseLike[];
  referenceData: Record<string, unknown>;
  vocabularies: Record<string, VocabTermLike[]>;
  programs: Record<string, ProgramRecordLike>;
  activeExercise: ProgramExerciseLike | string | null;
}

export interface ProgramPatientOptionLike {
  id: string;
  name: string;
  patient: UserLike;
}

export interface ProgramPatientSelectionLike {
  patientOptions: ProgramPatientOptionLike[];
  selectedPatientId: string | null;
  selectedPatientName: string;
  setSelectedPatientId: (patientId: string | null) => void;
}

export interface ProgramPageDataLike {
  exercises: ProgramExerciseLike[];
  referenceData: Record<string, unknown>;
  vocabularies: Record<string, VocabTermLike[]>;
  programs: Record<string, ProgramRecordLike>;
  loadError: string | null;
  offlineNotice: string | null;
  currentUserRole: string | null;
  accessError: string | null;
  programPatientId: string | null;
  loadData: (
    accessToken: string,
    authUserId: string,
    scopedPatientId: string | null,
  ) => Promise<unknown>;
  setProgramDataSnapshot: (snapshot: ProgramSnapshotLike) => void;
}

export interface ProgramDataSnapshotHookLike {
  persistProgramSnapshot: (snapshot: ProgramSnapshotLike) => Promise<void>;
  commitProgramData: (snapshot: ProgramSnapshotLike) => void;
}

export interface ProgramWorkspaceStateLike {
  search: string;
  showArchived: boolean;
  roleSearch: string;
  dosageSearch: string;
  activeExercise: ProgramExerciseLike | string | null;
  roleExerciseId: string;
  dosageExerciseId: string;
  dosageTarget: {
    exercise: ProgramExerciseLike | null;
    program: ProgramRecordLike | null;
  } | null;
  filtered: ProgramExerciseLike[];
  roleExerciseOptions: ProgramExerciseLike[];
  dosageExerciseOptions: ProgramExerciseLike[];
  formExercise: ProgramExerciseLike | null;
  roleExercise: ProgramExerciseLike | null;
  dosageExercise: ProgramExerciseLike | null;
  selectedProgram: ProgramRecordLike | null;
  setSearch: (value: string) => void;
  setShowArchived: (value: boolean) => void;
  setRoleSearch: (value: string) => void;
  setDosageSearch: (value: string) => void;
  setActiveExercise: (value: ProgramExerciseLike | string | null) => void;
  setRoleExerciseId: (value: string) => void;
  setDosageExerciseId: (value: string) => void;
  setDosageTarget: (
    value: {
      exercise: ProgramExerciseLike | null;
      program: ProgramRecordLike | null;
    } | null,
  ) => void;
  handleCancel: () => void;
  handleSelectExercise: (exerciseId: string) => void;
}

export interface ProgramQueueSummaryLike {
  failedCount: number;
  pendingCount: number;
  firstFailed?: unknown;
}

export interface ProgramOfflineQueueHookLike {
  mutationQueue: unknown[];
  queueSummary: ProgramQueueSummaryLike;
  queueError: string | null;
  queueLoaded: boolean;
  queueSyncing: boolean;
  enqueueMutation: (...args: unknown[]) => Promise<unknown>;
  persistQueue: (nextQueue: unknown[]) => Promise<void>;
  syncProgramMutations: () => Promise<unknown>;
}

export interface ProgramMutationActionsLike {
  handleSaved: (...args: unknown[]) => Promise<unknown>;
  handleDosageSave: (...args: unknown[]) => Promise<unknown>;
  handleAddRole: (...args: unknown[]) => Promise<unknown>;
  handleDeleteRole: (...args: unknown[]) => Promise<unknown>;
}

export interface FormParameterItemLike {
  parameter_name: string;
  display_suffix?: string | null;
  unit_options?: string[] | null;
  [key: string]: unknown;
}

export interface FormParameterActionsLike {
  items: FormParameterItemLike[];
  saving: boolean;
  error: string | null;
  handleAdd: (...args: unknown[]) => Promise<unknown>;
  handleUpdate: (...args: unknown[]) => Promise<unknown>;
  handleDelete: (...args: unknown[]) => Promise<unknown>;
}

export interface ProgramVocabActionsLike {
  handleAddVocabTerm: (...args: unknown[]) => Promise<unknown>;
  handleUpdateVocabTerm: (...args: unknown[]) => Promise<unknown>;
  handleDeleteVocabTerm: (...args: unknown[]) => Promise<unknown>;
}

export interface ProgramMutationUiLike {
  rolesLoading: boolean;
  vocabSaving: boolean;
  handleExerciseSaved: (...args: unknown[]) => Promise<unknown>;
  handleAddRole: (...args: unknown[]) => Promise<unknown>;
  handleDeleteRole: (...args: unknown[]) => Promise<unknown>;
  handleAddVocabTerm: (...args: unknown[]) => Promise<unknown>;
  handleUpdateVocabTerm: (...args: unknown[]) => Promise<unknown>;
  handleDeleteVocabTerm: (...args: unknown[]) => Promise<unknown>;
}

export interface ToastHookLike {
  showToast: (message: string, type?: '' | 'success' | 'error', duration?: number) => void;
  toastMessage: string;
  toastType: '' | 'success' | 'error';
  toastVisible: boolean;
}

export interface EffectiveConnectivityLike {
  browserOnline: boolean;
  effectiveOnline: boolean;
  effectiveOffline: boolean;
  reason: string | null;
  lastConfirmedOnlineAt: number;
  lastNetworkFailureAt: number;
}
