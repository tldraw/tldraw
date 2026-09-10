import { useUser } from '@clerk/clerk-react'
import { Navigate, Outlet } from 'react-router-dom'
import { routes } from '../../routeDefs'
import { getIsTldrawStaff } from '../hooks/useUser'

export function Component() {
	// Read isLoaded and user from the same Clerk subscription so we never decide
	// staff-ness from a half-loaded user (which would fail closed and bounce staff).
	const { isLoaded, user } = useUser()

	if (!isLoaded) return null
	if (!getIsTldrawStaff(user)) return <Navigate to={routes.tlaRoot()} replace />
	return <Outlet />
}
