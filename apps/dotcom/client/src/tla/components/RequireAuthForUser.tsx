import { useAuth } from '@clerk/clerk-react'
import { Outlet } from 'react-router-dom'

/**
 * At the user index, an authenticated user should be taken to their workspaces.
 * The logic for what to show for a user's workspace is determined on the
 * workspaces route.
 */
export function Component() {
	const auth = useAuth()

	if (!auth) throw Error('This should be wrapped in a workspace auth check')

	return <Outlet />
}
