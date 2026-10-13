import { OAuthConsent, Show } from '@clerk/react'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { routes } from '../../routeDefs'
import { bootedOnOAuthConsent } from '../../utils/clerkUi'
import { TlaLogo } from '../components/TlaLogo/TlaLogo'
import { OPEN_SIGN_IN, setRedirect } from '../utils/redirect'
import styles from './oauth-consent.module.css'

// Clerk sends MCP and plugin OAuth clients here (dashboard: Paths → OAuth consent) instead of its
// Account Portal. Clerk owns the consent logic and form POST; we only own the page around it, which
// Clerk requires to carry no navigation or sign-out links.
export function Component() {
	if (!bootedOnOAuthConsent) {
		window.location.reload()
		return null
	}
	return (
		<div className={styles.page}>
			<Helmet>
				<meta name="robots" content="noindex" />
			</Helmet>
			<Show when="signed-in">
				<TlaLogo className={styles.logo} />
				<OAuthConsent />
			</Show>
			<Show when="signed-out">
				<SignInThenReturn />
			</Show>
		</div>
	)
}

// Clerk signs users in before sending them here, so this is a direct visit or an expired session.
// `/` ignores Clerk's `redirect_url`, so the way back rides on the app's own post-sign-in redirect.
function SignInThenReturn() {
	const navigate = useNavigate()
	useEffect(() => {
		setRedirect(window.location.pathname + window.location.search)
		navigate(routes.tlaRoot(), { replace: true, state: { [OPEN_SIGN_IN]: true } })
	}, [navigate])
	return null
}
