import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { setInSessionStorage, useDialogs, useToasts } from 'tldraw'
import { routes } from '../../routeDefs'
import { TlaSignInDialog } from '../components/dialogs/TlaSignInDialog'
import { useFairyAccess } from '../hooks/useFairyAccess'
import { useFairyFlags } from '../hooks/useFairyFlags'
import { useTldrawUser } from '../hooks/useUser'
import { defineMessages, useMsg } from '../utils/i18n'

const messages = defineMessages({
	alreadyHasAccess: { defaultMessage: 'You already have fairy access!' },
})

export function Component() {
	const { token } = useParams<{ token: string }>()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const alreadyHasAccessMsg = useMsg(messages.alreadyHasAccess)
	const userHasActiveFairyAccess = useFairyAccess()
	const user = useTldrawUser()
	const { flags } = useFairyFlags()

	useEffect(() => {
		if (userHasActiveFairyAccess) {
			addToast({
				id: 'fairy-invite-already-has-access',
				title: alreadyHasAccessMsg,
			})
		}
	}, [userHasActiveFairyAccess, addToast, alreadyHasAccessMsg])

	useEffect(() => {
		if (userHasActiveFairyAccess) return
		if (!flags.fairies_enabled) return

		// Store token in session storage for both logged-in and logged-out users
		// TlaRootProviders will handle showing the dialog after sign-in (if needed)
		setInSessionStorage('fairy-invite-token', token!)
		if (!user) {
			setInSessionStorage('redirect-to', routes.tlaRoot())
			addDialog({ component: TlaSignInDialog })
		}
	}, [token, user, userHasActiveFairyAccess, addDialog, flags.fairies_enabled])

	// If fairies feature is disabled, redirect to home
	if (!flags.fairies_enabled) {
		return <Navigate to={routes.tlaRoot()} replace />
	}

	// If user already has access, redirect without showing dialog
	if (userHasActiveFairyAccess) {
		return <Navigate to={routes.tlaRoot()} replace />
	}

	return <Navigate to={routes.tlaRoot()} replace />
}
