const DEFAULT_MIN_TIME_TO_EXPIRY_MS = 5_000
const BACKGROUND_REFRESH_TIME_TO_EXPIRY_MS = 30_000
const FALLBACK_TOKEN_TTL_MS = 30_000

interface CachedToken {
	token: string
	expiresAt: number
}

export interface GetCachedTokenOptions {
	forceRefresh?: boolean
	minTimeToExpiryMs?: number
}

export type TlaGetToken = (options?: GetCachedTokenOptions) => Promise<string | undefined>

export function createCachedTokenGetter(
	getToken: () => Promise<string | null | undefined>
): TlaGetToken {
	let cachedToken: CachedToken | null = null
	let pendingRefresh: Promise<string | undefined> | null = null

	function refreshToken() {
		if (!pendingRefresh) {
			pendingRefresh = (async () => {
				const token = await getToken()
				if (!token) {
					cachedToken = null
					return undefined
				}

				cachedToken = {
					token,
					expiresAt: getTokenExpiresAt(token),
				}
				return token
			})().finally(() => {
				pendingRefresh = null
			})
		}
		return pendingRefresh
	}

	return async function getCachedToken({
		forceRefresh = false,
		minTimeToExpiryMs = DEFAULT_MIN_TIME_TO_EXPIRY_MS,
	}: GetCachedTokenOptions = {}) {
		const timeToExpiryMs = cachedToken ? cachedToken.expiresAt - Date.now() : 0
		if (!forceRefresh && cachedToken && timeToExpiryMs > minTimeToExpiryMs) {
			if (timeToExpiryMs < BACKGROUND_REFRESH_TIME_TO_EXPIRY_MS) {
				void refreshToken().catch((err) => {
					console.warn('[Auth] Failed to refresh cached token:', err)
				})
			}
			return cachedToken.token
		}

		return refreshToken()
	}
}

function getTokenExpiresAt(token: string) {
	const fallbackExpiresAt = Date.now() + FALLBACK_TOKEN_TTL_MS
	try {
		const payload = token.split('.')[1]
		if (!payload) return fallbackExpiresAt

		const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
		const padding = (4 - (normalized.length % 4)) % 4
		const decoded = globalThis.atob(normalized + '='.repeat(padding))
		const parsed = JSON.parse(decoded) as { exp?: unknown }
		if (typeof parsed.exp === 'number' && Number.isFinite(parsed.exp)) {
			return parsed.exp * 1000
		}
	} catch {
		// Fall back to a short TTL if Clerk ever changes token shape.
	}
	return fallbackExpiresAt
}
