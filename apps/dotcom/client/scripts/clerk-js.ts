// `clerk-js@5` is a no-store 307 to the latest 5.x, costing a Clerk round trip on every load. Resolving
// it once per build gives an immutable URL while still picking up Clerk's patches on each deploy.
export async function resolveClerkJsVersion(publishableKey: string | undefined): Promise<string> {
	if (!publishableKey) return '5'
	try {
		// Build-time Node code: @tldraw/utils' fetch wrapper is for the browser.
		// eslint-disable-next-line no-restricted-globals
		const res = await fetch(getClerkJsUrl(publishableKey, '5'), {
			method: 'HEAD',
			redirect: 'manual',
			signal: AbortSignal.timeout(5000),
		})
		const version = res.headers.get('location')?.match(/clerk-js@(5\.[^/]+)\//)?.[1]
		if (version) return version
		console.warn(`[clerk-js] no 5.x redirect (status ${res.status}); loading clerk-js@5`)
	} catch (e) {
		console.warn(`[clerk-js] could not resolve the clerk-js version; loading clerk-js@5`, e)
	}
	return '5'
}

// Mirrors clerkJsScriptUrl in @clerk/shared so index.html can preload the exact URL Clerk injects.
export function getClerkJsUrl(publishableKey: string, version: string) {
	const frontendApi = atob(publishableKey.split('_')[2]).replace(/\$$/, '')
	return `https://${frontendApi}/npm/@clerk/clerk-js@${version}/dist/clerk.browser.js`
}
