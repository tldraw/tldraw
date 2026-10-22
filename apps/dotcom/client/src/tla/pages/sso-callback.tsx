import { useAuth, useClerk } from '@clerk/react'
import { captureException } from '@sentry/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '../../routeDefs'
import { OPEN_SIGN_IN } from '../utils/redirect'

// Google sign-in returns here. A new Google user arrives as a sign-in that has to be transferred
// to a sign-up, which only this callback does; without it they land on `/` signed out. Clerk's
// <AuthenticateWithRedirectCallback /> drops a failure and leaves a blank page, so we call it here.
export function Component() {
	const clerk = useClerk()
	const { isLoaded } = useAuth()
	const navigate = useNavigate()
	useEffect(() => {
		if (!isLoaded) return
		clerk.handleRedirectCallback({}).catch((err: unknown) => {
			captureException(err)
			navigate(routes.tlaRoot(), { replace: true, state: { [OPEN_SIGN_IN]: true } })
		})
	}, [clerk, isLoaded, navigate])
	return null
}
