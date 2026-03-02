import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setInSessionStorage, useDialogs } from 'tldraw'
import { routes } from '../../routeDefs'
import { TlaSignInDialog } from '../components/dialogs/TlaSignInDialog'
import { setRedirectOnSignIn } from '../utils/redirect'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'

/** When logged out with a url, shows sign-in dialog on this page (like invite). When signed in, passes url via session storage and redirects to / so the import runs. */
export function Component() {
	const [searchParams] = useSearchParams()
	const url = searchParams.get('url')
	const auth = useAuth()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const [dialogShown, setDialogShown] = useState(false)

	useEffect(() => {
		if (!url || url.trim() === '') {
			navigate(routes.tlaRoot(), { replace: true })
			return
		}
		if (!auth.isLoaded) return

		if (!auth.isSignedIn) {
			if (!dialogShown) {
				setDialogShown(true)
				setRedirectOnSignIn()
				addDialog({
					component: (props) => <TlaSignInDialog {...props} skipRedirect />,
					onClose: () => navigate(routes.tlaRoot(), { replace: true }),
				})
			}
			return
		}

		setInSessionStorage(SESSION_STORAGE_KEYS.PENDING_IMPORT_URL, url)
		navigate(routes.tlaRoot(), { replace: true })
	}, [url, auth.isLoaded, auth.isSignedIn, addDialog, dialogShown, navigate])

	return null
}
