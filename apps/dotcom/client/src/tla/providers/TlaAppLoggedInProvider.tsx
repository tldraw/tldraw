import { useAuth } from '@clerk/clerk-react'
import { Navigate, Outlet } from 'react-router-dom'
import { AppStateProvider } from '../hooks/useAppState'
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
				<Outlet />
			</UserProvider>
		</AppStateProvider>
	)
}
