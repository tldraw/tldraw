import { useClerk } from '@clerk/clerk-react'

export default function LoginRedirectPage() {
	const clerk = useClerk()

	const signInUrl = clerk.buildSignInUrl({
		signInForceRedirectUrl: window.location.href,
		signUpForceRedirectUrl: window.location.href,
	})
	window.location.href = signInUrl

	return null
}
