import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { inferDosageType } from '../lib/program-optimistic';
import {
    createProgramMutation,
    isNetworkError,
    loadProgramQueue,
    LOCAL_PROGRAM_ID_PREFIX,
    markProgramMutationFailed,
    mergeProgramMutationQueue,
    performProgramMutation,
    replayProgramQueue,
    saveProgramQueue,
} from '../lib/program-offline';

function buildOptimisticProgram(program, exercise, formData, patientId) {
    return {
        ...(program ?? {}),
        id: program?.id ?? `${LOCAL_PROGRAM_ID_PREFIX}${exercise.id}`,
        exercise_id: exercise.id,
        patient_id: patientId,
        dosage_type: inferDosageType(formData, exercise),
        sets: formData.sets,
        reps_per_set: formData.reps_per_set ?? null,
        seconds_per_rep: formData.seconds_per_rep ?? null,
        seconds_per_set: formData.seconds_per_set ?? null,
        distance_feet: formData.distance_feet ?? null,
        exercises: program?.exercises ?? exercise,
    };
}

function applyQueuedProgramUpserts(programs, queue, exercisesById, patientId) {
    const nextPrograms = new Map((programs ?? []).map((program) => [program.exercise_id, program]));

    for (const mutation of queue ?? []) {
        if (mutation?.type !== 'program.upsert') continue;
        if (patientId && mutation.payload?.payload?.patient_id !== patientId) continue;

        const exerciseId = mutation.payload?.exercise_id;
        if (!exerciseId) continue;

        const exercise = exercisesById.get(exerciseId) ?? nextPrograms.get(exerciseId)?.exercises ?? null;
        if (!exercise) continue;

        nextPrograms.set(
            exerciseId,
            buildOptimisticProgram(
                nextPrograms.get(exerciseId) ?? null,
                exercise,
                mutation.payload.payload,
                mutation.payload.payload.patient_id
            )
        );
    }

    return Array.from(nextPrograms.values());
}

export function useTrackerDosageEditor({
    session,
    userRole,
    trackerPatientId,
    exercises,
    programs,
    reload,
    showToast,
}) {
    const [dosageTarget, setDosageTarget] = useState(null);
    const [mutationQueue, setMutationQueue] = useState([]);
    const queueRef = useRef([]);
    const syncInFlightRef = useRef(false);
    const canEditDosage = userRole !== 'patient';

    const exercisesById = useMemo(() => (
        new Map((exercises ?? []).map((exercise) => [exercise.id, exercise]))
    ), [exercises]);

    const programsForTracker = useMemo(() => (
        applyQueuedProgramUpserts(programs, mutationQueue, exercisesById, trackerPatientId)
    ), [exercisesById, mutationQueue, programs, trackerPatientId]);

    const persistQueue = useCallback(async (nextQueue) => {
        queueRef.current = nextQueue;
        setMutationQueue(nextQueue);
        if (session?.user?.id) {
            await saveProgramQueue(session.user.id, nextQueue);
        }
    }, [session?.user?.id]);

    const syncQueuedDosageChanges = useCallback(async () => {
        if (!session?.access_token || !session?.user?.id || !navigator.onLine || syncInFlightRef.current) {
            return;
        }

        const currentQueue = queueRef.current;
        if (!currentQueue.length) return;

        syncInFlightRef.current = true;
        try {
            const { failedMessage, syncedCount } = await replayProgramQueue(
                session.access_token,
                currentQueue,
                persistQueue
            );

            if (failedMessage) {
                showToast(failedMessage, 'error');
                return;
            }

            if (syncedCount > 0) {
                await reload();
                showToast(
                    syncedCount === 1
                        ? '1 pending dosage change synced.'
                        : `${syncedCount} pending program changes synced.`
                );
            }
        } finally {
            syncInFlightRef.current = false;
        }
    }, [persistQueue, reload, session?.access_token, session?.user?.id, showToast]);

    useEffect(() => {
        let cancelled = false;

        if (!session?.user?.id) {
            queueRef.current = [];
            setMutationQueue([]);
            setDosageTarget(null);
            return () => {
                cancelled = true;
            };
        }

        loadProgramQueue(session.user.id)
            .then((queue) => {
                if (cancelled) return;
                queueRef.current = queue;
                setMutationQueue(queue);
            })
            .catch(() => {
                if (cancelled) return;
                queueRef.current = [];
                setMutationQueue([]);
            });

        return () => {
            cancelled = true;
        };
    }, [session?.user?.id]);

    useEffect(() => {
        if (!session?.user?.id) return undefined;

        function handleOnline() {
            void syncQueuedDosageChanges();
        }

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [session?.user?.id, syncQueuedDosageChanges]);

    useEffect(() => {
        if (!mutationQueue.length || !navigator.onLine) return;
        void syncQueuedDosageChanges();
    }, [mutationQueue.length, syncQueuedDosageChanges]);

    const openDosageEditor = useCallback((exerciseId) => {
        if (!canEditDosage) return;
        const exercise = exercisesById.get(exerciseId) ?? null;
        if (!exercise) return;
        const program = programsForTracker.find((item) => item.exercise_id === exerciseId) ?? null;
        setDosageTarget({ exercise, program });
    }, [canEditDosage, exercisesById, programsForTracker]);

    const closeDosageEditor = useCallback(() => {
        setDosageTarget(null);
    }, []);

    const saveDosage = useCallback(async (formData) => {
        if (!session?.user?.id || !trackerPatientId || !dosageTarget?.exercise) {
            throw new Error('Unable to save dosage right now.');
        }

        const mutation = createProgramMutation('program.upsert', {
            exercise_id: dosageTarget.exercise.id,
            programId: dosageTarget.program?.id ?? null,
            payload: {
                ...formData,
                exercise_id: dosageTarget.exercise.id,
                patient_id: trackerPatientId,
            },
        });

        const previousQueue = queueRef.current;
        const nextQueue = mergeProgramMutationQueue(previousQueue, mutation);
        const shouldAttemptImmediateSave = Boolean(
            session?.access_token
            && navigator.onLine
            && nextQueue.length === 1
        );

        if (shouldAttemptImmediateSave) {
            syncInFlightRef.current = true;
        }
        await persistQueue(nextQueue);

        if (!session?.access_token || !navigator.onLine) {
            syncInFlightRef.current = false;
            setDosageTarget(null);
            showToast('Offline - dosage change will sync later', 'error');
            return;
        }

        if (nextQueue.length > 1) {
            syncInFlightRef.current = false;
            setDosageTarget(null);
            void syncQueuedDosageChanges();
            showToast('Dosage queued and will sync shortly.');
            return;
        }

        try {
            await performProgramMutation(session.access_token, mutation);
            await persistQueue(nextQueue.filter((item) => item.id !== mutation.id));
            await reload();
            setDosageTarget(null);
            showToast('Dosage saved.');
        } catch (error) {
            if (isNetworkError(error)) {
                const failedQueue = markProgramMutationFailed(
                    nextQueue,
                    mutation.id,
                    'Offline - dosage change will sync later'
                );
                await persistQueue(failedQueue);
                setDosageTarget(null);
                showToast('Offline - dosage change will sync later', 'error');
                return;
            }

            await persistQueue(previousQueue);
            throw error;
        } finally {
            syncInFlightRef.current = false;
        }
    }, [
        dosageTarget,
        persistQueue,
        reload,
        session?.access_token,
        session?.user?.id,
        showToast,
        syncQueuedDosageChanges,
        trackerPatientId,
    ]);

    return {
        canEditDosage,
        dosageTarget,
        programsForTracker,
        openDosageEditor,
        closeDosageEditor,
        saveDosage,
    };
}
