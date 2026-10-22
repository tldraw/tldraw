import { OAuthConsent, Show, useUser } from '@clerk/react'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { routes } from '../../routeDefs'
import { bootedOnOAuthConsent } from '../../utils/clerkUi'
import { TlaLogo } from '../components/TlaLogo/TlaLogo'
import { hasNotAcceptedLegal } from '../utils/auth'
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
				<ConsentOnceLegalAccepted />
			</Show>
			<Show when="signed-out">
				<ReturnViaRoot openSignIn />
			</Show>
		</div>
	)
}

// The legal terms dialog lives in the app's providers, which this route sits outside, so a new
// user would otherwise grant consent without ever accepting them.
function ConsentOnceLegalAccepted() {
	const { user } = useUser()
	if (hasNotAcceptedLegal(user)) return <ReturnViaRoot />
	return (
		<>
			<TlaLogo className={styles.logo} />
			<OAuthConsent appearance={{ variables: { colorPrimary: '#1d1d1d' } }} />
		</>
	)
}

// `/` signs the user in (it ignores Clerk's `redirect_url`) or shows the legal terms, then comes
// back here through the app's own post-sign-in redirect.
function ReturnViaRoot({ openSignIn = false }: { openSignIn?: boolean }) {
	const navigate = useNavigate()
	useEffect(() => {
		setRedirect(window.location.pathname + window.location.search)
		navigate(routes.tlaRoot(), {
			replace: true,
			state: openSignIn ? { [OPEN_SIGN_IN]: true } : null,
		})
	}, [navigate, openSignIn])
	return null
}
