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

			const controller = new AbortController()
			const { signal } = controller

			async function showSignInDialog() {
				// Fetch the invite info up front so the signed-out user sees which
				// group they've been invited to before signing in. This endpoint needs
				// no auth. On failure we fall back to the plain sign-in dialog.
				let inviteInfo: ValidInviteInfo | undefined
				try {
					const res = await fetch(`/api/app/invite/${token}`, { signal })
					const data: GetInviteInfoResponseBody = await res.json()
					// An invalid or expired token comes back as `{ error: true }`; we
					// still show the dialog, just without a group name.
					if (!data.error) inviteInfo = data
				} catch (err) {
					// The effect was cleaned up and the request aborted; abandon quietly.
					if (signal.aborted) return
					// Only genuine network or parsing failures reach here, not invalid
					// tokens. Log it so the failure isn't swallowed silently.
					console.error('Failed to load invite info', err)
				}

				if (signal.aborted) return
				// Mark the dialog as shown only now that we're actually showing it. If
				// the guard were set before the fetch resolved, an aborted attempt (an
				// effect re-run mid-flight) would leave the guard set, blocking any
				// retry and leaving the user on a blank page with no sign-in dialog.
				// Setting it here lets a re-run start a fresh fetch.
				dialogShown.current = true
				addDialog({
					component: (props) => <TlaSignInDialog {...props} inviteInfo={inviteInfo} skipRedirect />,
					onClose: () => navigate('/', { replace: true }),
				})
			}

			showSignInDialog()

			return () => controller.abort()
		}, [token, auth.isLoaded, auth.isSignedIn, addDialog, navigate])

		if (auth.isLoaded && auth.isSignedIn) {
			return <Navigate to="/" replace />
		}

		return null
	}
}
