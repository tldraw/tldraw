/**
 * Shared utilities for Fly.io scripts.
 *
 * App names:
 *   production-zero-rm    Production replication manager
 *   production-zero-vs    Production view syncer
 *   staging-zero-rm       Staging replication manager
 *   staging-zero-vs       Staging view syncer
 *   pr-NNNN-zero-cache    PR preview (single zero-cache process)
 */

export const FLY_ORG_SLUG = process.env.FLY_ORG_SLUG ?? 'tldraw-gb-ltd'

export function getFlyToken(explicit?: string): string {
	let token = explicit ?? process.env.FLY_TOKEN
	if (!token) {
		console.error(
			'No token provided. Use --token, FLY_TOKEN env var, or create one with: fly tokens create readonly'
		)
		process.exit(1)
	}
	// Strip "FlyV1 " prefix if present — callers add it themselves
	if (token.startsWith('FlyV1 ')) token = token.slice(6)
	return token
}

export function parseDuration(s: string, unit: 'ms' | 's' = 's'): number {
	const match = s.match(/^(\d+)(m|h|d)$/)
	if (!match) {
		console.error(`Invalid duration: ${s}. Use e.g. 30m, 2h, 1d`)
		process.exit(1)
	}
	const n = parseInt(match[1])
	const u = match[2]
	const multipliers: Record<string, number> = { m: 60, h: 3_600, d: 86_400 }
	const sec = n * multipliers[u]
	return unit === 'ms' ? sec * 1000 : sec
}
