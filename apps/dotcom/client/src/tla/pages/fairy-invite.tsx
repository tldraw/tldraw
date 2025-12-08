import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { setInSessionStorage, useDialogs } from 'tldraw'
import { TlaSignInDialog } from '../components/dialogs/TlaSignInDialog'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'

export function Component() {
	const { token } = useParams<{ token: string }>()
	const auth = useAuth()
	const { addDialog } = useDialogs()

	useEffect(() => {
		// Store token in session storage - handlers will process after sign-in
		setInSessionStorage(SESSION_STORAGE_KEYS.FAIRY_INVITE_TOKEN, token!)

		// If user is not signed in, show sign-in dialog
		if (auth.isLoaded && !auth.isSignedIn) {
			addDialog({
				component: (props) => <TlaSignInDialog {...props} skipRedirect />,
			})
		}
	}, [token, auth.isLoaded, auth.isSignedIn, addDialog])

	// Always redirect to root - handlers will process the token and check flags
	return <Navigate to="/" replace />
}
