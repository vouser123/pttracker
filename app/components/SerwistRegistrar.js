'use client';
// app/components/SerwistRegistrar.js — Client-side re-export of SerwistProvider.
// Root layout is a Server Component and cannot directly import client modules
// from @serwist/turbopack/react. This thin wrapper marks the boundary.
export { SerwistProvider } from '@serwist/turbopack/react';
