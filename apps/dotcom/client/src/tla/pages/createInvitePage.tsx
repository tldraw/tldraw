import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { setInSessionStorage, useDialogs } from 'tldraw'
import { TlaSignInDialog } from '../components/dialogs/TlaSignInDialog'

export function createInvitePage(sessionStorageKey: string) {
	return function InvitePage() {
		const { token } = useParams<{ token: string }>()
		const auth = useAuth()
		const { addDialog } = useDialogs()
		const navigate = useNavigate()
		const [dialogShown, setDialogShown] = useState(false)

		if (token) {
			setInSessionStorage(sessionStorageKey, token)
		}

		useEffect(() => {
			// Wait for auth to load before deciding what to do
			if (!auth.isLoaded) return

			// If user is not signed in, show sign-in dialog
			if (!auth.isSignedIn && !dialogShown) {
				setDialogShown(true)
				addDialog({
					component: (props) => <TlaSignInDialog {...props} skipRedirect />,
					onClose: () => navigate('/', { replace: true }),
				})
			}
		}, [token, auth.isLoaded, auth.isSignedIn, addDialog, dialogShown, navigate])

		if (auth.isLoaded && auth.isSignedIn) {
			return <Navigate to="/" replace />
		}

		return null
	}
}
