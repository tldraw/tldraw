import { useAuth } from '@clerk/react'
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getFromSessionStorage, setInSessionStorage } from 'tldraw'
import { routes } from '../../routeDefs'
import {
	clearRedirectOnSignIn,
	CLERK_FRONTEND_API_ORIGIN,
	getSignInRedirect,
	isClerkFrontendApiUrl,
	OPEN_SIGN_IN,
	setRedirect,
} from '../utils/redirect'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'

// Clerk's sign-in and sign-up URLs (dashboard: Paths) point here, so a signed-out user starting an
// MCP or plugin OAuth flow gets our sign-in dialog instead of the Account Portal. `/` owns the
// dialog, the legal terms and the post-sign-in redirect; this route only carries Clerk's
// `redirect_url` (usually the OAuth authorize URL) into that redirect.
export function Component() {
	const { isLoaded, isSignedIn } = useAuth()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const redirectUrl = searchParams.get('redirect_url')

	useEffect(() => {
		if (!isLoaded) return
		const target = getSignInRedirect(redirectUrl, {
			appOrigin: window.location.origin,
			clerkOrigin: CLERK_FRONTEND_API_ORIGIN,
		})
		// Each authorize URL is unique (state, PKCE challenge), so getting the same one back while
		// signed in means Clerk can't see this session, e.g. a dev instance on another site. Following
		// it again would bounce between Clerk and here forever.
		const loops =
			isSignedIn &&
			!!target &&
			isClerkFrontendApiUrl(target) &&
			getFromSessionStorage(SESSION_STORAGE_KEYS.SIGN_IN_FOLLOWED) === target
		// A redirect left over from an abandoned flow would otherwise win over this one.
		if (target && !loops) {
			setRedirect(target)
			if (isSignedIn) setInSessionStorage(SESSION_STORAGE_KEYS.SIGN_IN_FOLLOWED, target)
		} else {
			clearRedirectOnSignIn()
		}
		navigate(routes.tlaRoot(), {
			replace: true,
			state: isSignedIn ? null : { [OPEN_SIGN_IN]: true },
		})
	}, [isLoaded, isSignedIn, navigate, redirectUrl])

	return null
}
