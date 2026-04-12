'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useEffectiveConnectivity } from '../../hooks/useEffectiveConnectivity';
import { useProgramBootstrapWarmup } from '../../hooks/useProgramBootstrapWarmup';

export default function ProtectedClientWarmers() {
  const router = useRouter();
  const { session } = useAuth();
  const { effectiveOnline } = useEffectiveConnectivity();
  useProgramBootstrapWarmup({ session });

  useEffect(() => {
    if (!session?.user?.id) return;
    if (!effectiveOnline) return;
    void router.prefetch('/program');
  }, [effectiveOnline, router, session]);

  return null;
}
