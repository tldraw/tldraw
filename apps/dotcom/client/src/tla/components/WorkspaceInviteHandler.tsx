import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
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

const workspaceInviteMessages = defineMessages({
	alreadyMember: { defaultMessage: 'You are already a member of this workspace' },
	error: { defaultMessage: 'Something went wrong loading this invite. Please try again.' },
})

export function WorkspaceInviteHandler() {
	const auth = useAuth()
	const dialogs = useDialogs()
	const { addToast } = useToasts()
	const app = useMaybeApp()
	const alreadyMemberMsg = useMsg(workspaceInviteMessages.alreadyMember)
	const errorMsg = useMsg(workspaceInviteMessages.error)

	const { user } = useClerkUser()

	useEffect(() => {
		if (!auth.isLoaded) return
		if (!auth.isSignedIn || !auth.userId) return
		if (!app) return
		if (hasNotAcceptedLegal(user)) return

		const storedToken = getFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)

		if (storedToken) {
			deleteFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)

			// Fetch invite info from API
			fetch(`/api/app/invite/${storedToken}`)
				.then((res) => res.json())
				.then((data: GetInviteInfoResponseBody) => {
					if (data.error) {
						// The invite link is no longer valid: the owner has regenerated it
						// (re-roll) or the workspace is gone. Show a dedicated empty-state
						// instead of failing silently. (A toast is unreliable here: it is
						// added during the /invite -> / -> file route transition and gets
						// dismissed near-instantly at the default duration, so the dialog
						// is the surface that reliably reaches the user.)
						dialogs.addDialog({
							component: ({ onClose }) => <TlaInviteExpiredDialog onClose={onClose} />,
						})
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
				.catch(() => {
					// Genuine network/parse failure (not a 404, which resolves and is
					// handled above). No dialog competes here, so a toast is the right
					// surface — keepOpen so it survives the route transition rather than
					// being dismissed before the user sees it.
					addToast({
						id: 'workspace-invite-error',
						severity: 'error',
						title: errorMsg,
						keepOpen: true,
					})
				})
		}
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
	])

	return null
}
