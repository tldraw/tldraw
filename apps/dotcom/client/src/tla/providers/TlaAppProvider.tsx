import { ClerkProvider } from '@clerk/clerk-react'
import { Outlet } from 'react-router-dom'
import '../styles/tla.css'

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing Publishable Key')
}

export function Component() {
	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
			<Outlet />
		</ClerkProvider>
	)
}
