import { describe, expect, it } from 'vitest'
import { getClerkFrontendApiOrigin, getSignInRedirect, isClerkFrontendApiUrl } from './redirect'

const appOrigin = 'https://www.tldraw.com'
const clerkOrigin = 'https://clerk.tldraw.com'
const opts = { appOrigin, clerkOrigin }

describe('getClerkFrontendApiOrigin', () => {
	it('decodes the host from a publishable key', () => {
		expect(getClerkFrontendApiOrigin(`pk_live_${btoa('clerk.tldraw.com$')}`)).toBe(clerkOrigin)
		expect(getClerkFrontendApiOrigin(`pk_test_${btoa('foo-1.clerk.accounts.dev$')}`)).toBe(
			'https://foo-1.clerk.accounts.dev'
		)
	})

	it('returns null for a missing or malformed key', () => {
		expect(getClerkFrontendApiOrigin(undefined)).toBe(null)
		expect(getClerkFrontendApiOrigin('nope')).toBe(null)
		expect(getClerkFrontendApiOrigin('pk_live_!!!')).toBe(null)
	})
})

describe('getSignInRedirect', () => {
	it('keeps the OAuth authorize URL on our Clerk instance', () => {
		const authorize = `${clerkOrigin}/oauth/authorize?client_id=abc&state=xyz`
		expect(getSignInRedirect(authorize, opts)).toBe(authorize)
	})

	it('reduces our own URLs to a path', () => {
		expect(getSignInRedirect(`${appOrigin}/f/abc?x=1#h`, opts)).toBe('/f/abc?x=1#h')
		expect(getSignInRedirect('/oauth-consent?a=b', opts)).toBe('/oauth-consent?a=b')
	})

	it('drops the root, missing values and foreign origins', () => {
		expect(getSignInRedirect(null, opts)).toBe(null)
		expect(getSignInRedirect(`${appOrigin}/`, opts)).toBe(null)
		expect(getSignInRedirect('https://evil.example/oauth/authorize', opts)).toBe(null)
		expect(getSignInRedirect('//evil.example/x', opts)).toBe(null)
		expect(getSignInRedirect('https://clerk.tldraw.com.evil.example/x', opts)).toBe(null)
		expect(getSignInRedirect('javascript:alert(1)', opts)).toBe(null)
		expect(getSignInRedirect(`${clerkOrigin}/x`, { appOrigin, clerkOrigin: null })).toBe(null)
	})
})

describe('isClerkFrontendApiUrl', () => {
	it('matches only our Clerk origin', () => {
		expect(isClerkFrontendApiUrl(`${clerkOrigin}/oauth/authorize`, clerkOrigin)).toBe(true)
		expect(isClerkFrontendApiUrl('https://evil.example/', clerkOrigin)).toBe(false)
		expect(isClerkFrontendApiUrl('not a url', clerkOrigin)).toBe(false)
		expect(isClerkFrontendApiUrl(`${clerkOrigin}/x`, null)).toBe(false)
	})
})
