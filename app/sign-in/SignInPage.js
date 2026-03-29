'use client';
/**
 * app/sign-in/SignInPage.js — Public sign-in page (Client Component).
 *
 * Shows the AuthForm. Redirects to / once session is confirmed so users
 * who land here while already signed in are moved along immediately.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import AuthForm from '../../components/AuthForm';

export default function SignInPage() {
    const { session, loading, signIn } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && session) {
            router.replace('/');
        }
    }, [session, loading, router]);

    if (loading || session) return null;

    return <AuthForm onSignIn={signIn} />;
}
