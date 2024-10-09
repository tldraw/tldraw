import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { ReactNode, useCallback, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useRaw } from '../hooks/useRaw'
import '../styles/tla.css'
import { db } from '../utils/db'
import { TlaRootProviders } from './TlaRootProviders'

export const assetUrls = getAssetUrlsByImport()

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local')
}

export function Component() {
	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY}>
			<TlaRootProviders>
				<ThemeContainer>
					<ClerkSignIn>
						<Outlet />
					</ClerkSignIn>
				</ThemeContainer>
			</TlaRootProviders>
		</ClerkProvider>
	)
}

function ThemeContainer({ children }: { children: ReactNode }) {
	const theme = 'light'
	return (
		<div
			className={`tla-theme-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
		>
			{children}
		</div>
	)
}

export function ClerkSignIn({ children }: { children: ReactNode }) {
	const { getToken } = useAuth()

	const signInToInstantWithClerkToken = useCallback(async () => {
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
	}, [getToken])

	useEffect(() => {
		signInToInstantWithClerkToken()
	}, [signInToInstantWithClerkToken])

	const { isLoading, user, error } = db.useAuth()

	const raw = useRaw()

	if (isLoading) {
		return <div>{raw(`Loading...`)}</div>
	}

	if (error) {
		return <div>{raw(`Error signing in to Instant! ${error.message}`)}</div>
	}

	if (user) {
		return children
	}

	return (
		<div>
			<button onClick={signInToInstantWithClerkToken}>{raw(`Sign in to Instant`)}</button>
		</div>
	)
}
