import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
	deleteFromSessionStorage,
	fetch,
	getFromSessionStorage,
	useDialogs,
	useToasts,
} from 'tldraw'
import { useMaybeApp } from '../hooks/useAppState'
import { hasNotAcceptedLegal } from '../utils/auth'
import { defineMessages, useMsg } from '../utils/i18n'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'
import { TlaInviteDialog } from './dialogs/TlaInviteDialog'
import { TlaInviteExpiredDialog } from './dialogs/TlaInviteExpiredDialog'
import { TlaSignInDialog } from './dialogs/TlaSignInDialog'

const workspaceInviteMessages = defineMessages({
	alreadyMember: { defaultMessage: 'You are already a member of this workspace' },
	error: { defaultMessage: 'Something went wrong loading this invite. Please try again.' },
})

// The invite route redirects to the root with this query param to mark that
// the user is arriving from an invite link. The signed-out sign-in dialog only
// shows when the marker is present; the invite token alone isn't enough, since
// it stays in session storage after the dialog is dismissed (so a later
// sign-in still completes the join) and would otherwise re-show the dialog on
// every plain visit to tldraw.com in the same tab.
export const WORKSPACE_INVITE_QUERY_PARAM = 'invite'

type ValidInviteInfo = Extract<GetInviteInfoResponseBody, { error: false }>

export function WorkspaceInviteHandler() {
	const auth = useAuth()
	const dialogs = useDialogs()
	const { addToast } = useToasts()
	const app = useMaybeApp()
	const alreadyMemberMsg = useMsg(workspaceInviteMessages.alreadyMember)
	const errorMsg = useMsg(workspaceInviteMessages.error)
	// The location dependency makes the effect re-check session storage after
	// each navigation, since visiting an invite link stores a new token and
	// redirects to the root without any other dependency changing.
	const location = useLocation()
	const [searchParams, setSearchParams] = useSearchParams()

	const { user } = useClerkUser()
	const signInDialogShownForToken = useRef<string | null>(null)

	useEffect(() => {
		if (!auth.isLoaded) return

		const storedToken = getFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)
		if (!storedToken) return

		if (!auth.isSignedIn) {
			// A signed-out user has a pending invite: show the sign-in dialog with
			// the invite context on top of the anonymous editor. The token stays in
			// session storage so the signed-in branch below can complete the join
			// once they've signed in.
			if (!searchParams.has(WORKSPACE_INVITE_QUERY_PARAM)) return
			if (signInDialogShownForToken.current === storedToken) return

			const controller = new AbortController()
			const { signal } = controller

			// Fetch the invite info up front so the signed-out user sees which
			// workspace they've been invited to before signing in. This endpoint
			// needs no auth. An invalid or expired token comes back as
			// `{ error: true }`; either that or a network/parsing failure leaves us
			// with no workspace name, in which case we fall back to the plain
			// sign-in dialog rather than blocking sign-in.
			async function loadInviteInfo(): Promise<ValidInviteInfo | undefined> {
				try {
					const res = await fetch(`/api/app/invite/${storedToken}`, { signal })
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
				// Mark the dialog as shown only now that we're actually showing it.
				// If the guard were set before the fetch resolved, an aborted attempt
				// (an effect re-run mid-flight) would leave the guard set, blocking
				// any retry. Keying the guard by token also lets a different invite
				// link replace the dialog, which the stable dialog id makes seamless.
				signInDialogShownForToken.current = storedToken
				dialogs.addDialog({
					id: 'workspace-invite-sign-in',
					component: (props) => <TlaSignInDialog {...props} inviteInfo={inviteInfo} skipRedirect />,
				})
				// Strip the marker now that the dialog is up, so reloading the
				// cleaned-up URL doesn't re-show it. The dialog survives this
				// navigation: dialogs live in a provider-level atom that nothing
				// clears on route changes.
				setSearchParams(
					(params) => {
						params.delete(WORKSPACE_INVITE_QUERY_PARAM)
						return params
					},
					{ replace: true }
				)
			}

			showSignInDialog()
			return () => controller.abort()
		}

		if (!auth.userId) return
		if (!app) return
		if (hasNotAcceptedLegal(user)) return

		deleteFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)

		const showError = () =>
			addToast({
				id: 'workspace-invite-error',
				severity: 'error',
				title: errorMsg,
				keepOpen: true,
			})

		// Fetch invite info from API
		fetch(`/api/app/invite/${storedToken}`)
			.then(async (res) => {
				// 404 means the invite no longer resolves (link regenerated or workspace
				// gone) — the only case that warrants the expired empty-state. Other
				// failures (400, 500) are errors, not expired links.
				if (res.status === 404) {
					dialogs.addDialog({
						component: ({ onClose }) => <TlaInviteExpiredDialog onClose={onClose} />,
					})
					return
				}

				if (!res.ok) {
					showError()
					return
				}

				const data: GetInviteInfoResponseBody = await res.json()
				if (data.error) {
					showError()
					return
				}

				// Check if already a member
				if (app.getWorkspaceMembership(data.workspaceId)) {
					addToast({
						id: 'workspace-invite-already-member',
						title: alreadyMemberMsg,
					})
					app.navigateToWorkspaceFiles(data.workspaceId)
					return
				}

				// Show invite dialog
				dialogs.addDialog({
					component: ({ onClose }) => <TlaInviteDialog inviteInfo={data} onClose={onClose} />,
				})
			})
			.catch(showError)
	}, [
		auth.isLoaded,
		auth.userId,
		auth.isSignedIn,
		dialogs,
		app,
		user,
		addToast,
		alreadyMemberMsg,
		errorMsg,
		location,
		searchParams,
		setSearchParams,
	])

	return null
}
