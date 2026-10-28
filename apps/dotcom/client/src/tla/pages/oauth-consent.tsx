import { OAuthConsent, Show, useUser } from '@clerk/react'
import { OAuthConsentBeaconRequestBody, OAuthConsentOutcome } from '@tldraw/dotcom-shared'
import { fetch } from '@tldraw/utils'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { routes } from '../../routeDefs'
import { bootedOnOAuthConsent } from '../../utils/clerkUi'
import { TlaLogo } from '../components/TlaLogo/TlaLogo'
import { hasNotAcceptedLegal } from '../utils/auth'
import { OPEN_SIGN_IN, setRedirect } from '../utils/redirect'
import styles from './oauth-consent.module.css'

// This page's only telemetry. It is outside the app's analytics providers and runs before Clerk
// boots on the reload path, so PostHog isn't available; and the reload and redirect outcomes tear the
// page down immediately, which is why the beacon needs `keepalive` to survive. Fire-and-forget: a
// failed send isn't worth surfacing, and nothing here waits on it. The worker drops anything outside
// OAUTH_CONSENT_OUTCOMES, so the `OAuthConsentOutcome` type is the only guard needed at the call site.
function sendOAuthConsentBeacon(outcome: OAuthConsentOutcome) {
	const body: OAuthConsentBeaconRequestBody = { outcome }
	fetch('/api/app/oauth-consent-beacon', {
		method: 'POST',
		keepalive: true,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}).catch(() => {})
}

// Clerk sends MCP and plugin OAuth clients here (dashboard: Paths → OAuth consent) instead of its
// Account Portal. Clerk owns the consent logic and form POST; we only own the page around it, which
// Clerk requires to carry no navigation or sign-out links.
export function Component() {
	if (!bootedOnOAuthConsent) {
		// The scariest post-enable failure: if this ever misfires, every OAuth user hits an infinite
		// reload loop. The beacon (sent before the reload clears it) is what makes that loop visible.
		sendOAuthConsentBeacon('reload_guard')
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
	return <ConsentForm />
}

// Split out so `page_shown` fires from an effect only when the form actually mounts — the legal-terms
// branch above returns before this, and a conditional hook up there would break the rules of hooks.
function ConsentForm() {
	useEffect(() => {
		sendOAuthConsentBeacon('page_shown')
	}, [])
	// Clerk owns the form POST and redirects the browser away on both allow and deny, so there is no
	// reliable allow/deny signal to capture here (its onAllow/onDeny are deprecated and don't fire in
	// this mode). A granted consent shows up downstream as mcp_server_initialize; a denied or abandoned
	// one is this page_shown with no such connect.
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
		sendOAuthConsentBeacon(openSignIn ? 'redirect_signed_out' : 'redirect_legal')
		setRedirect(window.location.pathname + window.location.search)
		navigate(routes.tlaRoot(), {
			replace: true,
			state: openSignIn ? { [OPEN_SIGN_IN]: true } : null,
		})
	}, [navigate, openSignIn])
	return null
}
