import { useEffect, useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useToasts } from 'tldraw'
import { routes } from '../../routeDefs'
import { useFairyAccess } from '../hooks/useFairyAccess'
import { defineMessages, useMsg } from '../utils/i18n'

const messages = defineMessages({
	alreadyHasAccess: { defaultMessage: 'You already have fairy access!' },
})

export function Component() {
	const { token } = useParams<{ token: string }>()
	const { addToast } = useToasts()
	const alreadyHasAccessMsg = useMsg(messages.alreadyHasAccess)
	const userHasActiveFairyAccess = useFairyAccess()

	// Memoize the state object to prevent Navigate from re-rendering infinitely
	const navigateState = useMemo(() => ({ fairyInviteToken: token }), [token])

	useEffect(() => {
		if (userHasActiveFairyAccess) {
			addToast({
				id: 'fairy-invite-already-has-access',
				title: alreadyHasAccessMsg,
			})
		}
	}, [userHasActiveFairyAccess, addToast, alreadyHasAccessMsg])

	// If user already has access, redirect without showing dialog
	if (userHasActiveFairyAccess) {
		return <Navigate to={routes.tlaRoot()} replace />
	}

	return <Navigate to={routes.tlaRoot()} state={navigateState} replace />
}
