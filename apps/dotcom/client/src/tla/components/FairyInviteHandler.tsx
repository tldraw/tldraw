import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { deleteFromSessionStorage, getFromSessionStorage, useDialogs, useToasts } from 'tldraw'
import { useFairyAccess } from '../hooks/useFairyAccess'
import { useFeatureFlags } from '../hooks/useFeatureFlags'
import { hasNotAcceptedLegal } from '../utils/auth'
import { defineMessages, useMsg } from '../utils/i18n'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'
import { TlaFairyInviteDialog } from './dialogs/TlaFairyInviteDialog'

const fairyInviteMessages = defineMessages({
	alreadyHasAccess: { defaultMessage: 'You already have fairy access!' },
})

export function FairyInviteHandler() {
	const auth = useAuth()
	const dialogs = useDialogs()
	const { addToast } = useToasts()
	const { flags, isLoaded } = useFeatureFlags()
	const hasFairyAccess = useFairyAccess()
	const alreadyHasAccessMsg = useMsg(fairyInviteMessages.alreadyHasAccess)

	const { user } = useClerkUser()

	useEffect(() => {
		if (!auth.isLoaded) return
		if (!auth.isSignedIn || !auth.userId) return
		if (!isLoaded) return // Wait for flags to load before processing
		if (hasNotAcceptedLegal(user)) return

		const storedToken = getFromSessionStorage(SESSION_STORAGE_KEYS.FAIRY_INVITE_TOKEN)

		if (storedToken) {
			deleteFromSessionStorage(SESSION_STORAGE_KEYS.FAIRY_INVITE_TOKEN)

			// Show toast if user already has access
			if (hasFairyAccess) {
				addToast({
					id: 'fairy-invite-already-has-access',
					title: alreadyHasAccessMsg,
				})
				return
			}

			// Only show dialog if fairies are enabled
			if (flags.fairies.enabled) {
				dialogs.addDialog({
					component: ({ onClose }) => (
						<TlaFairyInviteDialog fairyInviteToken={storedToken} onClose={onClose} />
					),
				})
			}
			// If flags are disabled, token is cleaned up but dialog is not shown
		}
	}, [
		auth.isLoaded,
		auth.userId,
		auth.isSignedIn,
		dialogs,
		flags.fairies.enabled,
		isLoaded,
		hasFairyAccess,
		addToast,
		alreadyHasAccessMsg,
		user,
	])

	return null
}
