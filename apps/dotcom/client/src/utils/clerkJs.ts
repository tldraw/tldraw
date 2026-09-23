// Exact version: `clerk-js@5` is a no-store 307, costing a Clerk round trip on every load. Pinning
// also stops picking up 5.x patches automatically, so bump it with Clerk upgrades and advisories.
export const CLERK_JS_VERSION = '5.127.2'

// Mirrors clerkJsScriptUrl in @clerk/shared so index.html can preload the exact URL Clerk injects.
export function getClerkJsUrl(publishableKey: string) {
	const frontendApi = atob(publishableKey.split('_')[2]).replace(/\$$/, '')
	return `https://${frontendApi}/npm/@clerk/clerk-js@${CLERK_JS_VERSION}/dist/clerk.browser.js`
}
