import { OAuthConsent, Show, useUser } from '@clerk/react'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { routes } from '../../routeDefs'
import { bootedOnOAuthConsent } from '../../utils/clerkUi'
import { TlaLogo } from '../components/TlaLogo/TlaLogo'
import { hasNotAcceptedLegal } from '../utils/auth'
import { getStoredThemePreference } from '../utils/local-session-state'
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
	// This route renders outside the app's providers, so it has none of the app's theme context. The
	// app mirrors the signed-in user's resolved theme to local storage, which we read here (same
	// origin): an explicit choice pins data-theme; no stored session leaves the page to the OS via the
	// CSS media query.
	const storedTheme = getStoredThemePreference()
	return (
		<div className={styles.page} data-theme={storedTheme ?? undefined}>
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

// Keeps the Clerk card's theme in step with the page: the stored preference when there is one, else
// the OS preference read live, so flipping OS appearance updates the card as well as the page CSS.
function useIsDark() {
	const [prefersDark, setPrefersDark] = useState(
		() =>
			typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
	)
	useEffect(() => {
		const query = window.matchMedia?.('(prefers-color-scheme: dark)')
		if (!query) return
		const onChange = () => setPrefersDark(query.matches)
		query.addEventListener('change', onChange)
		return () => query.removeEventListener('change', onChange)
	}, [])
	const storedTheme = getStoredThemePreference()
	return storedTheme ? storedTheme === 'dark' : prefersDark
}

// The legal terms dialog lives in the app's providers, which this route sits outside, so a new
// user would otherwise grant consent without ever accepting them.
function ConsentOnceLegalAccepted() {
	const { user } = useUser()
	const isDark = useIsDark()
	if (hasNotAcceptedLegal(user)) return <ReturnViaRoot />
	return (
		<>
			<TlaLogo className={styles.logo} />
			<OAuthConsent
				appearance={{
					variables: isDark ? darkVariables : lightVariables,
					// The card logo is Clerk's dark app tile, which sinks into the dark card. The mark is
					// monochrome, so inverting it reads as a white tile with a black mark.
					elements: isDark ? { logoImage: { filter: 'invert(1)' } } : undefined,
				}}
			/>
		</>
	)
}

// Colours are literals: outside the app's providers the tla/tl colour variables aren't defined. The
// light values match the page's own light palette; the dark values mirror the app's dark theme.
// The page is black and white: Clerk's default warning colour is orange, and the card shows a
// warning for every self-registered (unverified) MCP client.
const lightVariables = { colorPrimary: '#1d1d1d', colorWarning: '#1d1d1d' }
const darkVariables = {
	colorPrimary: '#f5f5f5',
	colorWarning: '#f5f5f5',
	colorBackground: '#1d1d1d',
	colorText: '#f5f5f5',
	colorInputBackground: '#2a2a2a',
	colorInputText: '#f5f5f5',
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
