import { useUser } from '@clerk/clerk-react'
import { Navigate, Outlet } from 'react-router-dom'
import { routes } from '../../routeDefs'
import { getIsTldrawStaff } from '../hooks/useUser'

// Routes under this gate fetch staff-only APIs in their components, not in route loaders. Loaders
// run before Clerk loads and refreshes the `__session` cookie, so on a cold load their requests
// carry an expired token and get a 401.
export function Component() {
	// Read isLoaded and user from the same Clerk subscription so we never decide
	// staff-ness from a half-loaded user (which would fail closed and bounce staff).
	const { isLoaded, user } = useUser()

	if (!isLoaded) return null
	if (!getIsTldrawStaff(user)) return <Navigate to={routes.tlaRoot()} replace />
	return <Outlet />
}
