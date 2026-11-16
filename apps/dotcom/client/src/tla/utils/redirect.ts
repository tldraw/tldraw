import { deleteFromSessionStorage, setInSessionStorage } from 'tldraw'
import { SESSION_STORAGE_KEYS } from './session-storage'

export function setRedirect(path: string) {
	setInSessionStorage(SESSION_STORAGE_KEYS.REDIRECT, path)
}

export function setRedirectOnSignIn() {
	const path = window.location.pathname + window.location.search + window.location.hash
	if (path !== '/') {
		setRedirect(path)
	}
}

export function clearRedirectOnSignIn() {
	deleteFromSessionStorage(SESSION_STORAGE_KEYS.REDIRECT)
}

export const OPEN_SIGN_IN = 'openSignIn'

/**
 * Clerk's Frontend API origin, decoded from the publishable key the same way the sync worker's
 * getMcpAuthorizationServer does, so the two can't disagree about which instance is ours.
 */
export function getClerkFrontendApiOrigin(publishableKey: string | undefined): string | null {
	if (!publishableKey) return null
	const encoded = publishableKey.replace(/^pk_(test|live)_/, '')
	if (encoded === publishableKey) return null
	try {
		const host = atob(encoded).replace(/\$$/, '')
		return host ? `https://${host}` : null
	} catch {
		return null
	}
}

/**
 * The post-sign-in destination for a `redirect_url` Clerk hands `/sign-in`, or null to drop it.
 * Only our own paths and our Clerk instance (the OAuth authorize URL) pass: anything else would make
 * `/sign-in` an open redirect that lands a freshly signed-in user on an attacker's page.
 */
export function getSignInRedirect(
	redirectUrl: string | null,
	{ appOrigin, clerkOrigin }: { appOrigin: string; clerkOrigin: string | null }
): string | null {
	if (!redirectUrl) return null
	let url: URL
	try {
		url = new URL(redirectUrl, appOrigin)
	} catch {
		return null
	}
	if (url.origin === appOrigin) {
		const path = url.pathname + url.search + url.hash
		// `//host/x` is a path here but a protocol-relative URL to whatever navigates to it.
		return path === '/' || path.startsWith('//') ? null : path
	}
	return isClerkFrontendApiUrl(url.href, clerkOrigin) ? url.href : null
}

export const CLERK_FRONTEND_API_ORIGIN = getClerkFrontendApiOrigin(
	// @ts-ignore this is fine
	import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
)

export function isClerkFrontendApiUrl(value: string, clerkOrigin = CLERK_FRONTEND_API_ORIGIN) {
	if (!clerkOrigin) return false
	try {
		return new URL(value).origin === clerkOrigin
	} catch {
		return false
	}
}
