import { useUser } from '@clerk/clerk-react'
import { hasActiveFairyAccess } from '@tldraw/dotcom-shared'
import { useEffect, useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useToasts } from 'tldraw'
import { routes } from '../../routeDefs'
import { useMaybeApp } from '../hooks/useAppState'
import { defineMessages, useMsg } from '../utils/i18n'

const messages = defineMessages({
	alreadyHasAccess: { defaultMessage: 'You already have fairy access!' },
})

export function Component() {
	const { token } = useParams<{ token: string }>()
	const app = useMaybeApp()
	const { user: clerkUser } = useUser()
	const { addToast } = useToasts()
	const alreadyHasAccessMsg = useMsg(messages.alreadyHasAccess)

	// Check if user already has active fairy access
	const user = app?.getUser()
	const userHasActiveFairyAccess =
		clerkUser && user ? hasActiveFairyAccess(user.fairyAccessExpiresAt, user.fairyLimit) : false

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
