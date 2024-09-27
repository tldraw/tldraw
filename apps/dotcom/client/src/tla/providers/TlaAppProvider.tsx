import { Navigate, Outlet } from 'react-router-dom'
import { AppStateProvider } from '../hooks/useAppState'
import '../styles/tla.css'

// prototype shit, this will be set during fake login
export const USER_ID_KEY = 'tldraw_app_userId'

export function Component() {
	// eslint-disable-next-line no-restricted-syntax
	const userId = localStorage.getItem(USER_ID_KEY)
	if (!userId) {
		return <Navigate to="/q/local" replace />
	}
	return (
		<AppStateProvider>
			<Outlet />
		</AppStateProvider>
	)
}
