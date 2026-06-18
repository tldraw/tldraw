import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
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

// The invite route redirects to the root with this query param to mark that the
// signed-out invite flow is active. The sign-in dialog shows while the marker is
// present and clears it when dismissed, so the URL is the source of truth: a
// refresh while the dialog is up keeps it, while dismissing (or a plain visit to
// tldraw.com, which carries no marker) does not bring it back. The invite token
// can't play this role — it deliberately outlives the dialog so a later sign-in
// still completes the join, and would otherwise re-nag on every visit in the
// same tab.
export const WORKSPACE_INVITE_QUERY_PARAM = 'invite'

type ValidInviteInfo = Extract<GetInviteInfoResponseBody, { error: false }>

export function WorkspaceInviteHandler() {
	const auth = useAuth()
	const dialogs = useDialogs()
	const { addToast } = useToasts()
	const app = useMaybeApp()
	const alreadyMemberMsg = useMsg(workspaceInviteMessages.alreadyMember)
	const errorMsg = useMsg(workspaceInviteMessages.error)
	const location = useLocation()
	const [searchParams, setSearchParams] = useSearchParams()

	const { user } = useClerkUser()

	// Signed out with a pending invite: show the sign-in dialog with the invite
	// context on top of the anonymous editor.
	useEffect(() => {
		if (!auth.isLoaded || auth.isSignedIn) return

		const storedToken = getFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)
		if (!storedToken) return

		// Only show when arriving from an invite link. The token can't gate this on
		// its own: it outlives the dialog so a later sign-in still completes the
		// join, whereas the marker is the ephemeral "show it now" signal.
		if (!searchParams.has(WORKSPACE_INVITE_QUERY_PARAM)) return

		const controller = new AbortController()
		const { signal } = controller

		// Fetch the invite info up front so the signed-out user sees which
		// workspace they've been invited to before signing in. This endpoint needs
		// no auth. An invalid or expired token comes back as `{ error: true }`;
		// either that or a network/parsing failure leaves us with no workspace name,
		// in which case we fall back to the plain sign-in dialog rather than
		// blocking sign-in.
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
			// The stable dialog id means a re-arrival from another invite link
			// replaces the open dialog rather than stacking a second one.
			dialogs.addDialog({
				id: 'workspace-invite-sign-in',
				component: (props) => <TlaSignInDialog {...props} inviteInfo={inviteInfo} skipRedirect />,
				preventBackgroundClose: true,
				// Push, not replace: dismissing leaves the ?invite URL behind in
				// history, so the invite stays a real back-navigable state rather than
				// being erased.
				onClose: () =>
					setSearchParams((params) => {
						params.delete(WORKSPACE_INVITE_QUERY_PARAM)
						return params
					}),
			})
		}

		showSignInDialog()
		return () => controller.abort()
	}, [auth.isLoaded, auth.isSignedIn, dialogs, location, searchParams, setSearchParams])

	// Signed in with a pending invite: complete the join.
	useEffect(() => {
		if (!auth.isLoaded || !auth.isSignedIn) return
		if (!auth.userId) return
		if (!app) return
		if (hasNotAcceptedLegal(user)) return

		const storedToken = getFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)
		if (!storedToken) return

		// Consume the token: this is the only place it is deleted.
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
					// Replace, not push: the invite is moot for an existing member, so
					// it shouldn't linger in history as a back-navigable state.
					app.navigateToWorkspaceFiles(data.workspaceId, { replace: true })
					return
				}

				// Show invite dialog. The stable id makes a re-add replace the open
				// dialog instead of stacking a second one if the effect re-fetches.
				dialogs.addDialog({
					id: 'workspace-invite-join',
					component: ({ onClose }) => <TlaInviteDialog inviteInfo={data} onClose={onClose} />,
				})
			})
			.catch(showError)
	}, [
		auth.isLoaded,
		auth.isSignedIn,
		auth.userId,
		app,
		user,
		dialogs,
		addToast,
		alreadyMemberMsg,
		errorMsg,
		location,
	])

	return null
}
