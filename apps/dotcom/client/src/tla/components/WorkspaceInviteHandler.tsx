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

const workspaceInviteMessages = defineMessages({
	alreadyMember: { defaultMessage: 'You are already a member of this workspace' },
})

export function WorkspaceInviteHandler() {
	const auth = useAuth()
	const dialogs = useDialogs()
	const { addToast } = useToasts()
	const app = useMaybeApp()
	const alreadyMemberMsg = useMsg(workspaceInviteMessages.alreadyMember)

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
						// Invalid invite token, ignore
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
					// Error fetching invite, ignore
				})
		}
	}, [auth.isLoaded, auth.userId, auth.isSignedIn, dialogs, app, user, addToast, alreadyMemberMsg])

	return null
}
