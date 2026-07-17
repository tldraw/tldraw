import { useUser as useClerkUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { getFromLocalStorage, setInLocalStorage } from 'tldraw'
import { trackEvent } from '../../utils/analytics'

/**
 * Consider a Clerk account "newly created" if it was created within this window.
 * A returning sign-in has a `createdAt` from hours, days, or weeks ago, so it
 * never matches.
 *
 * The window must comfortably span the gap between the account being created and
 * analytics mounting. tldraw.com has an in-app email flow (TlaSignInDialog) where
 * the user requests a code, leaves to check their email, and returns to enter it,
 * which can take several minutes. Clerk's verification codes expire after ~10
 * minutes, which bounds how long a *completable* sign-up can take, so 30 minutes
 * leaves comfortable margin above that ceiling while still excluding any returning
 * login.
 */
export const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000

const SIGNUP_TRACKED_KEY_PREFIX = 'tldraw_signup_tracked_'

/**
 * Whether `user` represents a genuine first-time sign-up rather than a returning
 * login, based on how recently the Clerk account was created. Sign-up completes
 * either via an OAuth redirect or the in-app email flow, both of which land the
 * user in the signed-in app shortly after the account is created, so the freshly
 * created account's `createdAt` is a reliable client-side signal. See
 * {@link NEW_ACCOUNT_WINDOW_MS} for how the window accommodates the email flow.
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
