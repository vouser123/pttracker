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

  useEffect(() => {
    if (!session?.user?.id) return;
    if (typeof window === 'undefined' || navigator.onLine === false) return;

    const protectedRoutes = ['/program', '/pt-view', '/rehab'];
    void Promise.allSettled(
      protectedRoutes.map((route) =>
        fetch(route, {
          credentials: 'include',
          headers: {
            'x-pt-offline-warm': '1',
          },
        })
      )
    );
  }, [session]);

  return null;
}
