import { isOAuthConsentPath } from './clerkUi'

test('matches every path React Router renders the consent page on', () => {
	for (const path of ['/oauth-consent', '/oauth-consent/', '/OAuth-Consent', '/oauth-consent//']) {
		expect(isOAuthConsentPath(path)).toBe(true)
	}
})

test('does not match other paths', () => {
	for (const path of ['/', '/oauth-consent/x', '/oauth-consentx', '/x/oauth-consent']) {
		expect(isOAuthConsentPath(path)).toBe(false)
	}
})
