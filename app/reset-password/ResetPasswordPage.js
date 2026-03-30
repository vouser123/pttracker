'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './ResetPasswordPage.module.css';

export default function ResetPasswordPage() {
    const [view, setView] = useState('loading');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setView('form');
            }
        });

        const timeout = setTimeout(() => {
            setView((prev) => (prev === 'loading' ? 'invalid' : prev));
        }, 3000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setSubmitting(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;

            await supabase.auth.signOut();
            setView('success');
        } catch (submitError) {
            setError(submitError.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                {view === 'loading' && (
                    <p className={styles.center}>Verifying reset link…</p>
                )}

                {view === 'invalid' && (
                    <div className={styles.center}>
                        <h2>Invalid or expired link</h2>
                        <p>This password reset link is no longer valid.</p>
                        <p>Please request a new one from the sign-in page.</p>
                    </div>
                )}

                {view === 'form' && (
                    <>
                        <h2 className={styles.heading}>Set New Password</h2>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.field}>
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    placeholder="New password"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.field}>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="Confirm password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    className={styles.input}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className={styles.button}
                            >
                                {submitting ? 'Updating…' : 'Update Password'}
                            </button>
                            {error && <p className={styles.error}>{error}</p>}
                        </form>
                    </>
                )}

                {view === 'success' && (
                    <div className={styles.center}>
                        <h2>Password Updated</h2>
                        <p>Your password has been changed successfully.</p>
                        <p><a href="/" className={styles.link}>Go to PT Tracker</a></p>
                    </div>
                )}
            </div>
        </div>
    );
}
