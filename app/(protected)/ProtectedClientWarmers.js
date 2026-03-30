'use client';

import { useProgramBootstrapWarmup } from '../../hooks/useProgramBootstrapWarmup';

export default function ProtectedClientWarmers() {
  useProgramBootstrapWarmup();
  return null;
}
