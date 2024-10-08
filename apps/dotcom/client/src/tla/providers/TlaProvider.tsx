import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { useValue } from 'tldraw'
import { AppStateProvider, useApp } from '../hooks/useAppState'
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
				<ThemeContainer>
					<Outlet />
				</ThemeContainer>
			</UserProvider>
		</AppStateProvider>
	)
}

function ThemeContainer({ children }: { children: ReactNode }) {
	const app = useApp()
	const theme = useValue('theme', () => app?.getSessionState().theme ?? 'light', [app])
	return (
		<div
			className={`tla-theme-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
		>
			{children}
		</div>
	)
}
