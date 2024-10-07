import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { Outlet } from 'react-router-dom'
import { AppStateProvider } from '../hooks/useAppState'
import { UserProvider } from '../hooks/useUser'
import '../styles/tla.css'
import { TlaRootProviders } from './TlaRootProviders'

export const assetUrls = getAssetUrlsByImport()

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local')
}

export function Component() {
	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/q">
			<TlaRootProviders>
				<SignedInProvider />
			</TlaRootProviders>
		</ClerkProvider>
	)
}

function SignedInProvider() {
	const auth = useAuth()

	if (!auth.isLoaded) return null

	if (!auth.isSignedIn) {
		return <Outlet />
	}

	return (
		<AppStateProvider>
			<UserProvider>
				<Outlet />
			</UserProvider>
		</AppStateProvider>
	)
}
