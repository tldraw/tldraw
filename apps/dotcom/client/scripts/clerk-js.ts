import { createRequire } from 'module'

// clerk-react loads `clerk-js@<major>`, a no-store 307 to the latest release, costing a Clerk round
// trip on every load. Resolving it once per build gives an immutable URL while still picking up
// Clerk's patches on each deploy. The URL comes from the @clerk/shared that clerk-react itself
// uses, so the major always matches the installed clerk-react.
export async function resolveClerkJs(
	publishableKey: string | undefined
): Promise<{ version: string; url: string } | null> {
	if (!publishableKey) return null
	try {
		const clerkReact = createRequire(import.meta.url).resolve('@clerk/clerk-react/package.json')
		// Assumes ClerkProvider sets none of proxyUrl/domain/clerkJSVariant/clerkJSUrl; pass them here
		// if it ever does, or the preload misses and the script downloads twice.
		const { clerkJsScriptUrl } = createRequire(clerkReact)('@clerk/shared/loadClerkJsScript')
		// Build-time Node code: @tldraw/utils' fetch wrapper is for the browser.
		// eslint-disable-next-line no-restricted-globals
		const res = await fetch(clerkJsScriptUrl({ publishableKey }), {
			method: 'HEAD',
			redirect: 'manual',
			signal: AbortSignal.timeout(5000),
		})
		const version = res.headers.get('location')?.match(/clerk-js@([^/]+)\//)?.[1]
		if (version)
			return { version, url: clerkJsScriptUrl({ publishableKey, clerkJSVersion: version }) }
		console.warn(`[clerk-js] no version redirect (status ${res.status}); not pinning clerk-js`)
	} catch (e) {
		console.warn('[clerk-js] could not resolve the clerk-js version; not pinning clerk-js', e)
	}
	return null
}
