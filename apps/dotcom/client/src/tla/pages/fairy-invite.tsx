import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { setInSessionStorage, useDialogs } from 'tldraw'
import { TlaSignInDialog } from '../components/dialogs/TlaSignInDialog'

export function Component() {
	const { token } = useParams<{ token: string }>()
	const auth = useAuth()
	const { addDialog } = useDialogs()

	useEffect(() => {
		// Store token in session storage - handlers will process after sign-in
		setInSessionStorage('fairy-invite-token', token!)

		// If user is not signed in, show sign-in dialog
		if (auth.isLoaded && !auth.isSignedIn) {
			addDialog({ component: TlaSignInDialog })
		}
	}, [token, auth.isLoaded, auth.isSignedIn, addDialog])

	// Always redirect to root - handlers will process the token and check flags
	return <Navigate to="/" replace />
}
