// tldraw.dev's TldrawLink adds `#session_id=…&distinct_id=…&ts=…` (ts in ms) when a link to
// tldraw.com is clicked. Links copied from there into blog posts once carried a fixed id, which made
// every reader the same PostHog person, so the ids are only trusted while ts is fresh.
const MAX_HASH_AGE_MS = 2 * 60 * 1000

export interface PosthogHashBootstrap {
	sessionID: string
	distinctID: string
}

export function getPosthogBootstrapFromHash(
	hash: string,
	now: number
): PosthogHashBootstrap | undefined {
	const params = new URLSearchParams(hash.replace(/^#/, ''))
	const sessionID = params.get('session_id')
	const distinctID = params.get('distinct_id')
	const ts = params.get('ts')
	if (!sessionID || !distinctID || !ts) return undefined
	const timestamp = Number(ts)
	if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) >= MAX_HASH_AGE_MS) return undefined
	return { sessionID, distinctID }
}

/** Reads the bootstrap ids and removes them from the address bar so they can't be copied on. */
export function takePosthogBootstrapFromHash(): PosthogHashBootstrap | undefined {
	const { hash, pathname, search } = window.location
	const params = new URLSearchParams(hash.replace(/^#/, ''))
	if (!params.has('session_id') && !params.has('distinct_id')) return undefined

	const bootstrap = getPosthogBootstrapFromHash(hash, Date.now())
	// Keep history.state: React Router stores its navigation index there.
	window.history.replaceState(window.history.state, '', `${pathname}${search}`)
	return bootstrap
}
