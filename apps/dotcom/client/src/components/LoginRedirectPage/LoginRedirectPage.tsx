import { ClerkProvider, useClerk } from '@clerk/clerk-react'
import { useEffect } from 'react'

export default function LoginRedirectPage() {
	// @ts-ignore this is fine
	const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

	if (!PUBLISHABLE_KEY) {
		throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local')
	}

	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY}>
			<LoginRedirectPageInner />
		</ClerkProvider>
	)
}

function LoginRedirectPageInner() {
	const clerk = useClerk()

	useEffect(() => {
		const signInUrl = clerk.buildSignInUrl({ signInForceRedirectUrl: window.location.href })
		window.location.href = signInUrl
	}, [clerk])

	return null
}
