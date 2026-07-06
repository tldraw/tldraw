import { useUser as useClerkUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { getFromLocalStorage, setInLocalStorage } from 'tldraw'
import { trackEvent } from '../../utils/analytics'

/**
 * Consider a Clerk account "newly created" if it was created within this window.
 * A returning sign-in has a `createdAt` from hours, days, or weeks ago, so it
 * never matches; the window only needs to comfortably span the post-sign-up
 * redirect back to the app and the legal-acceptance step before analytics mounts.
 */
export const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000

const SIGNUP_TRACKED_KEY_PREFIX = 'tldraw_signup_tracked_'

/**
 * Whether `user` represents a genuine first-time sign-up rather than a returning
 * login, based on how recently the Clerk account was created. tldraw.com uses
 * Clerk's hosted sign-up flow, which completes on Clerk's pages and redirects
 * back, so there is no in-app sign-up callback to hook into — the freshly created
 * account's `createdAt` is the reliable client-side signal.
 */
export function isNewSignUp(user: { createdAt: Date | null }, now: number): boolean {
	const createdAt = user.createdAt?.getTime()
	if (!createdAt) return false
	return now - createdAt <= NEW_ACCOUNT_WINDOW_MS
}

/**
 * The sign-up method to report to analytics: the OAuth provider used to create
 * the account (e.g. `google`), or `email` for email-based sign-ups.
 */
export function getSignUpMethod(user: {
	externalAccounts: ReadonlyArray<{ provider: string }>
}): string {
	return user.externalAccounts[0]?.provider ?? 'email'
}

/**
 * Fires a `sign_up` analytics event once when a user first creates an account
 * through Clerk. It distinguishes a genuine sign-up from a returning login using
 * the Clerk account's `createdAt` (see {@link isNewSignUp}), and dedupes per
 * account via localStorage so it fires at most once per new account on a given
 * device — even if the user reloads or revisits while the account is still new.
 *
 * The event flows through {@link trackEvent}, which forwards `sign_up` to GA4
 * (for Google Ads conversion measurement) as well as PostHog.
 */
export function useSignUpTracking() {
	const { user, isLoaded } = useClerkUser()

	useEffect(() => {
		if (!isLoaded || !user) return
		if (!isNewSignUp(user, Date.now())) return

		// Fire once per account on this device.
		const key = SIGNUP_TRACKED_KEY_PREFIX + user.id
		if (getFromLocalStorage(key)) return
		setInLocalStorage(key, '1')

		trackEvent('sign_up', { method: getSignUpMethod(user) })
	}, [isLoaded, user])
}
