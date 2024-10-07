import { useAuth } from '@clerk/clerk-react'
import { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useValue } from 'tldraw'
import { AppStateProvider, useApp } from '../hooks/useAppState'
import { UserProvider } from '../hooks/useUser'
import '../styles/tla.css'

export function Component() {
	const auth = useAuth()

	if (!auth.isLoaded) return null

	if (!auth.isSignedIn) {
		// todo: different routes should implement redirects; for example, shared files need to be accessible by from anon users
		return <Navigate to="/q/local" replace />
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
