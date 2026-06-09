import { useAuth } from '@clerk/clerk-react'
import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useEffect, useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { fetch, setInSessionStorage, useDialogs } from 'tldraw'
import { TlaSignInDialog } from '../components/dialogs/TlaSignInDialog'

type ValidInviteInfo = Extract<GetInviteInfoResponseBody, { error: false }>

export function createInvitePage(sessionStorageKey: string) {
	return function InvitePage() {
		const { token } = useParams<{ token: string }>()
		const auth = useAuth()
		const { addDialog } = useDialogs()
		const navigate = useNavigate()
		const dialogShown = useRef(false)

		if (token) {
			setInSessionStorage(sessionStorageKey, token)
		}

		useEffect(() => {
			// Wait for auth to load before deciding what to do
			if (!auth.isLoaded) return
			// Only signed-out users need the sign-in dialog, and only show it once
			if (auth.isSignedIn || dialogShown.current || !token) return

			dialogShown.current = true
			let cancelled = false

			// Fetch the invite info up front so the signed-out user sees which group
			// they've been invited to before signing in. This endpoint needs no auth;
			// on any error we fall back to the plain sign-in dialog.
			fetch(`/api/app/invite/${token}`)
				.then((res) => res.json())
				.then((data: GetInviteInfoResponseBody): ValidInviteInfo | undefined =>
					data.error ? undefined : data
				)
				.catch(() => undefined)
				.then((inviteInfo) => {
					if (cancelled) return
					addDialog({
						component: (props) => (
							<TlaSignInDialog {...props} inviteInfo={inviteInfo} skipRedirect />
						),
						onClose: () => navigate('/', { replace: true }),
					})
				})

			return () => {
				cancelled = true
			}
		}, [token, auth.isLoaded, auth.isSignedIn, addDialog, navigate])

		if (auth.isLoaded && auth.isSignedIn) {
			return <Navigate to="/" replace />
		}

		return null
	}
}
