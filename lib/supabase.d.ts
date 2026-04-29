import type { AuthSessionLike } from '../hooks/program-route-types';

export interface SupabaseAuthSubscriptionLike {
  unsubscribe: () => void;
}

export interface SupabaseAuthClientLike {
  getSession: () => Promise<{ data: { session: AuthSessionLike | null } }>;
  getUser: () => Promise<{ error: { message?: string } | null }>;
  onAuthStateChange: (callback: (event: string, session: AuthSessionLike | null) => void) => {
    data: {
      subscription: SupabaseAuthSubscriptionLike;
    };
  };
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ error: { message?: string } | null }>;
  signOut: () => Promise<unknown>;
}

export interface SupabaseClientLike {
  auth: SupabaseAuthClientLike;
  [key: string]: unknown;
}

export const supabase: SupabaseClientLike;
