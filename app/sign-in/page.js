// app/sign-in/page.js — Public sign-in route.
// Server Component: exports metadata; delegates rendering to SignInPage (client).

import SignInPage from './SignInPage';

export const metadata = {
    title: 'Sign In — PT Tracker',
};

export default function SignInRoute() {
    return <SignInPage />;
}
