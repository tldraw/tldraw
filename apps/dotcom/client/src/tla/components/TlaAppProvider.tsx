import { ClerkProvider } from '@clerk/clerk-react'
import { Outlet } from 'react-router-dom'
import { AppStateProvider } from '../hooks/useAppState'
import { UserProvider } from '../hooks/useUser'
import '../styles/tla.css'

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export function Component() {
	if (!PUBLISHABLE_KEY) {
		throw new Error('Missing Publishable Key')
	}

	return (
		<AppStateProvider>
			<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
				<UserProvider>
					<Outlet />
				</UserProvider>
			</ClerkProvider>
		</AppStateProvider>
	)
}
