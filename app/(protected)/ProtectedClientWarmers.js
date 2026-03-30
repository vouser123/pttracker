'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useProgramBootstrapWarmup } from '../../hooks/useProgramBootstrapWarmup';

export default function ProtectedClientWarmers() {
  const router = useRouter();
  const { session } = useAuth();
  useProgramBootstrapWarmup({ session });

  useEffect(() => {
    if (!session?.user?.id) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    void router.prefetch('/program');
  }, [router, session]);

  return null;
}
