import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { deleteFromSessionStorage, fetch, getFromSessionStorage, useDialogs } from 'tldraw'
import { useMaybeApp } from '../hooks/useAppState'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'
import { TlaInviteDialog } from './dialogs/TlaInviteDialog'

export function GroupInviteHandler() {
	const auth = useAuth()
	const dialogs = useDialogs()
	const app = useMaybeApp()

	const { user } = useClerkUser()

	useEffect(() => {
		if (!auth.isLoaded) return
		if (!auth.isSignedIn || !auth.userId) return
		if (!app) return
		if (
			user &&
			!user.legalAcceptedAt && // Clerk's canonical metadata key (older accounts)
			!user.unsafeMetadata?.legal_accepted_at // our metadata key (newer accounts)
		) {
			return
		}

		const storedToken = getFromSessionStorage(SESSION_STORAGE_KEYS.GROUP_INVITE_TOKEN)

		if (storedToken) {
			deleteFromSessionStorage(SESSION_STORAGE_KEYS.GROUP_INVITE_TOKEN)

			// Fetch invite info from API
			fetch(`/api/app/invite/${storedToken}`)
				.then((res) => res.json())
				.then((data) => {
					if (data.error) {
						// Invalid invite token, ignore
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
	}, [auth.isLoaded, auth.userId, auth.isSignedIn, dialogs, app, user])

	return null
}
