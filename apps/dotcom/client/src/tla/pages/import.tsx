import { useAuth } from '@clerk/clerk-react'
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDialogs } from 'tldraw'
import { routes } from '../../routeDefs'
import { TlaSignInDialog } from '../components/dialogs/TlaSignInDialog'
import { setRedirectOnSignIn } from '../utils/redirect'

/** When logged out with a url, shows sign-in dialog on this page (like invite). When signed in, redirects to / with the url in location state so local runs the import. */
export function Component() {
	const [searchParams] = useSearchParams()
	const url = searchParams.get('url')
	const auth = useAuth()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const dialogShownRef = useRef(false)

	useEffect(() => {
		if (!url?.trim()) {
			navigate(routes.tlaRoot(), { replace: true })
			return
		}
		if (!auth.isLoaded) return

		if (auth.isSignedIn) {
			navigate(routes.tlaRoot(), { replace: true, state: { importUrl: url } })
			return
		}

		if (dialogShownRef.current) return
		dialogShownRef.current = true
		setRedirectOnSignIn()
		addDialog({
			component: (props) => <TlaSignInDialog {...props} />,
		})
	}, [url, auth.isLoaded, auth.isSignedIn, addDialog, navigate])

	return null
}
