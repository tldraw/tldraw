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

const LOGS_BASE_URL = `https://api.fly.io/victorialogs/${FLY_ORG_SLUG}/select/logsql/query`

/** One VictoriaLogs record: `_msg` is the raw log line, which for zero-cache is itself JSON. */
export interface FlyLogEntry {
	_time: string
	_msg: string
}

/**
 * Query an app's logs. `filter` is appended to the app filter as LogsQL, e.g. `'"Slow query"'`.
 * Results come back newest-first-capped at `limit`, so a filter is what keeps a busy app's noise
 * from crowding out what you're looking for.
 */
export async function queryFlyLogs(opts: {
	app: string
	start: string
	end: string
	filter?: string
	limit?: number
	token?: string
}): Promise<FlyLogEntry[]> {
	const query = opts.filter
		? `fly.app.name: ${opts.app} AND ${opts.filter}`
		: `fly.app.name: ${opts.app}`
	const params = new URLSearchParams({ query, start: opts.start, end: opts.end })
	if (opts.limit) params.set('limit', String(opts.limit))

	const res = await fetch(`${LOGS_BASE_URL}?${params}`, {
		headers: { Authorization: `FlyV1 ${getFlyToken(opts.token)}` },
	})
	if (!res.ok) {
		throw new Error(`Fly logs query failed: HTTP ${res.status}: ${await res.text()}`)
	}
	const body = await res.text()
	if (!body.trim()) return []
	return body
		.trim()
		.split('\n')
		.flatMap((line) => {
			try {
				return [JSON.parse(line) as FlyLogEntry]
			} catch {
				return []
			}
		})
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
