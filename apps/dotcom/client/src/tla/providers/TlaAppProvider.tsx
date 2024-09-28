import { Outlet } from 'react-router-dom'
import { AppStateProvider } from '../hooks/useAppState'
import '../styles/tla.css'

export function Component() {
	return (
		<AppStateProvider>
			<Outlet />
		</AppStateProvider>
	)
}
