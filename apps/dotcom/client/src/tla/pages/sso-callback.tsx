import { AuthenticateWithRedirectCallback } from '@clerk/react'

// Google sign-in returns here. A new Google user arrives as a sign-in that has to be transferred
// to a sign-up, which only this callback does; without it they land on `/` signed out.
export function Component() {
	return <AuthenticateWithRedirectCallback />
}
