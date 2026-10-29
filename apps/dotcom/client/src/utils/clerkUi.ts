import { matchPath } from 'react-router-dom'
import { ROUTES } from '../routeDefs'

// React Router matches case-insensitively and with any trailing slashes; a stricter check here
// leaves the consent page rendering without the UI bundle, reloading forever.
export function isOAuthConsentPath(pathname: string) {
	return matchPath(ROUTES.tlaOAuthConsent, pathname) !== null
}

// Evaluated once, when main.tsx boots. Clerk only loads its UI bundle at boot, so a consent page
// reached by client-side navigation has none, and <OAuthConsent /> throws without it.
export const bootedOnOAuthConsent = isOAuthConsentPath(window.location.pathname)
