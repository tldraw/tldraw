import { Navigate, Outlet } from 'react-router-dom'
import { useMaybeApp } from '../hooks/useAppState'

export function Component() {
	const app = useMaybeApp()
	if (!app) {
		return <Navigate to="/q" />
	}
	return <Outlet />
}
