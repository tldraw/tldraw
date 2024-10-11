import { Navigate, Outlet } from 'react-router-dom'
import { useMaybeApp } from '../hooks/useAppState'

export function Component() {
	const app = useMaybeApp()
	if (!app) {
		// todo: add a back-to location in the location state, redirect back to here after sign in
		return <Navigate to="/q" />
	}
	return <Outlet />
}
