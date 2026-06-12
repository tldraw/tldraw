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
		// The token the dialog is currently showing invite info for. Keying the
		// guard by token (rather than a boolean) lets a token change replace the
		// open dialog with fresh invite info instead of being ignored.
		const dialogShownForToken = useRef<string | null>(null)

		if (token) {
			setInSessionStorage(sessionStorageKey, token)
		}

		useEffect(() => {
			// Wait for auth to load before deciding what to do
			if (!auth.isLoaded) return
			// Only signed-out users need the sign-in dialog, and only show it once
			// per token
			if (auth.isSignedIn || dialogShownForToken.current === token || !token) return
			const inviteToken = token

			const controller = new AbortController()
			const { signal } = controller

			// Fetch the invite info up front so the signed-out user sees which group
			// they've been invited to before signing in. This endpoint needs no auth.
			// An invalid or expired token comes back as `{ error: true }`; either that
			// or a network/parsing failure leaves us with no group name, in which case
			// we fall back to the plain sign-in dialog rather than blocking sign-in.
			async function loadInviteInfo(): Promise<ValidInviteInfo | undefined> {
				try {
					const res = await fetch(`/api/app/invite/${inviteToken}`, { signal })
					const data: GetInviteInfoResponseBody = await res.json()
					return data.error ? undefined : data
				} catch (err) {
					// An aborted request (effect cleanup) is expected; only log real
					// failures so they aren't swallowed silently.
					if (!signal.aborted) console.error('Failed to load invite info', err)
					return undefined
				}
			}

			async function showSignInDialog() {
				const inviteInfo = await loadInviteInfo()
				if (signal.aborted) return
				// Mark the dialog as shown only now that we're actually showing it. If
				// the guard were set before the fetch resolved, an aborted attempt (an
				// effect re-run mid-flight) would leave the guard set, blocking any
				// retry and leaving the user on a blank page with no sign-in dialog.
				// Setting it here lets a re-run start a fresh fetch.
				dialogShownForToken.current = inviteToken
				// The fixed id makes addDialog replace the open dialog if the token
				// changed while it was up, rather than stacking a second one.
				addDialog({
					id: 'invite-sign-in',
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
