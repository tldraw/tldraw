// An exact version, not a major: Clerk answers `clerk-js@5` with an uncacheable redirect, so every
// load, even a warm one, paid a round trip to the Clerk host before the script could start. The
// exact URL is served immutable. Bump this when upgrading @clerk/clerk-react.
export const CLERK_JS_VERSION = '5.127.2'

// Mirrors clerkJsScriptUrl in @clerk/shared so index.html can preload the exact URL Clerk injects.
export function getClerkJsUrl(publishableKey: string) {
	const frontendApi = atob(publishableKey.split('_')[2]).replace(/\$$/, '')
	return `https://${frontendApi}/npm/@clerk/clerk-js@${CLERK_JS_VERSION}/dist/clerk.browser.js`
}
