import { describe, expect, it } from 'vitest'
import { NEW_ACCOUNT_WINDOW_MS, getSignUpMethod, isNewSignUp } from './useSignUpTracking'

describe('isNewSignUp', () => {
	const now = 1_700_000_000_000

	it('returns true for an account created just now', () => {
		expect(isNewSignUp({ createdAt: new Date(now) }, now)).toBe(true)
	})

	it('returns true within the new-account window', () => {
		expect(isNewSignUp({ createdAt: new Date(now - NEW_ACCOUNT_WINDOW_MS + 1) }, now)).toBe(true)
	})

	it('returns false once the account is older than the window (a returning login)', () => {
		expect(isNewSignUp({ createdAt: new Date(now - NEW_ACCOUNT_WINDOW_MS - 1) }, now)).toBe(false)
	})

	it('returns false for accounts created days ago', () => {
		const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000
		expect(isNewSignUp({ createdAt: new Date(twoDaysAgo) }, now)).toBe(false)
	})

	it('returns false when createdAt is missing', () => {
		expect(isNewSignUp({ createdAt: null }, now)).toBe(false)
	})
})

describe('getSignUpMethod', () => {
	it('returns the OAuth provider when the account has an external account', () => {
		expect(getSignUpMethod({ externalAccounts: [{ provider: 'google' }] })).toBe('google')
	})

	it('returns "email" when there are no external accounts', () => {
		expect(getSignUpMethod({ externalAccounts: [] })).toBe('email')
	})
})
