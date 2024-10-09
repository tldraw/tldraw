import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { db } from '../utils/db'

export function ClerkSignedInComponent() {
	const { getToken, signOut } = useAuth()

	const signInToInstantWithClerkToken = async () => {
		// getToken gets the jwt from Clerk for your signed in user.
		const idToken = await getToken()

		if (!idToken) {
			// No jwt, can't sign in to instant
			return
		}

		// Create a long-lived session with Instant for your clerk user
		// It will look up the user by email or create a new user with
		// the email address in the session token.
		db.auth.signInWithIdToken({
			clientName: 'tldraw_clerk',
			idToken: idToken,
		})
	}

	useEffect(() => {
		signInToInstantWithClerkToken()
	}, [])

	const { isLoading, user, error } = db.useAuth()

	if (isLoading) {
		return <div>Loading...</div>
	}
	if (error) {
		return <div>Error signing in to Instant! {error.message}</div>
	}
	if (user) {
		return <Outlet />
	}
	return (
		<div>
			<button onClick={signInToInstantWithClerkToken}>Sign in to Instant</button>
		</div>
	)
}
