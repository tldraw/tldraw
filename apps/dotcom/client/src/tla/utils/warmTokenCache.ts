// SPIKE — warm auth-token cache. Not for merge.
//
// Keeps a recently-minted Clerk token in memory so callers on the navigation
// critical path (the per-file sync connection) get it synchronously-fast instead
// of paying ~150ms for a Clerk token refresh. A `keepWarm()` tick refreshes the
// token ahead of expiry so `get()` almost always hits the cache.
//
// This is a distilled, dotcom-scoped variant of the app-wide cache in #9343. To
// survive the per-file editor remount it must be instantiated ABOVE the file
// routes (see UserProvider), not inside TlaEditor.

const MIN_TIME_TO_EXPIRY_MS = 10_000
const FALLBACK_TTL_MS = 30_000

interface CachedToken {
	token: string
	expiresAt: number
}

export interface WarmTokenGetter {
	/** Return a cached token if it has enough life left, otherwise refresh. */
	get(): Promise<string | undefined>
	/** Force a refresh (used by the keep-warm interval). */
	keepWarm(): Promise<string | undefined>
}

export function createWarmTokenGetter(
	getToken: () => Promise<string | null | undefined>
): WarmTokenGetter {
	let cached: CachedToken | null = null
	let pending: Promise<string | undefined> | null = null

	function refresh() {
		if (!pending) {
			pending = Promise.resolve()
				.then(getToken)
				.then((token) => {
					cached = token ? { token, expiresAt: getJwtExpiry(token) } : null
					return token ?? undefined
				})
				.finally(() => {
					pending = null
				})
		}
		return pending
	}

	return {
		get() {
			if (cached && cached.expiresAt - Date.now() > MIN_TIME_TO_EXPIRY_MS) {
				return Promise.resolve(cached.token)
			}
			return refresh()
		},
		keepWarm() {
			return refresh()
		},
	}
}

function getJwtExpiry(token: string): number {
	const fallback = Date.now() + FALLBACK_TTL_MS
	try {
		const payload = token.split('.')[1]
		if (!payload) return fallback
		const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
		const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
		const parsed = JSON.parse(globalThis.atob(padded)) as { exp?: unknown }
		if (typeof parsed.exp === 'number' && Number.isFinite(parsed.exp)) {
			return parsed.exp * 1000
		}
	} catch {
		// Clerk token shape changed — fall back to a short TTL.
	}
	return fallback
}
