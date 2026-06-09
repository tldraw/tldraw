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
