import { useEffect, useState } from 'react';
import {
    getTrackerLifecycleFilterStorageKey,
    normalizeLifecycleFilter,
} from '../lib/exercise-sort';

export function useTrackerPrnVisibility(userId) {
    const [lifecycleFilter, setLifecycleFilterState] = useState('routine');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!userId) {
            setLifecycleFilterState('routine');
            return;
        }

        const storageKey = getTrackerLifecycleFilterStorageKey(userId);
        const storedValue = storageKey ? window.sessionStorage.getItem(storageKey) : null;
        setLifecycleFilterState(normalizeLifecycleFilter(storedValue));
    }, [userId]);

    useEffect(() => {
        if (typeof window === 'undefined' || !userId) return;
        const storageKey = getTrackerLifecycleFilterStorageKey(userId);
        if (!storageKey) return;
        window.sessionStorage.setItem(storageKey, lifecycleFilter);
    }, [lifecycleFilter, userId]);

    return {
        lifecycleFilter,
        setLifecycleFilter: (value) => setLifecycleFilterState(normalizeLifecycleFilter(value)),
    };
}
