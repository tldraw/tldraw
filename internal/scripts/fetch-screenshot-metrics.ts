/**
 * Fetch board screenshot telemetry (the mcp_shared_board_screenshot dataset events) from the
 * Cloudflare Analytics Engine SQL API and report failure rate, timeout rate, cache hit rate, and
 * Browser Run render time per request source (mcp = MCP tool, og = GET og-image route, queue = async
 * render consumer).
 *
 * Render time is wall-clock time around each Browser Run capture (double3), not Cloudflare's billed
 * browser milliseconds: the BROWSER binding does not surface a per-render billed-ms figure the way
 * the old REST path did (double4 is always -1), so wall-clock render time is the available proxy for
 * Browser Run spend.
 *
 * Usage:
 *   npx tsx internal/scripts/fetch-screenshot-metrics.ts [options]
 *
 * Examples:
 *   npx tsx internal/scripts/fetch-screenshot-metrics.ts --last 24h
 *   npx tsx internal/scripts/fetch-screenshot-metrics.ts --worker main-tldraw-multiplayer --last 7d
 *   npx tsx internal/scripts/fetch-screenshot-metrics.ts --check --max-failure-rate 0.2 --max-render-minutes 300
 *
 * With --check the script exits non-zero when a threshold is breached, so it can back a scheduled
 * alert (cron CI job, uptime monitor, etc.) without any extra infrastructure.
 *
 * Auth: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_API_TOKEN (an API token with the
 * "Account Analytics: Read" permission; CLOUDFLARE_API_TOKEN works as a fallback).
 */

const EVENT_NAME = 'mcp_shared_board_screenshot'

interface Options {
	lastHours: number
	worker?: string
	dataset: string
	json: boolean
	check: boolean
	maxFailureRate?: number
	maxTimeoutRate?: number
	minCacheHitRate?: number
	maxRenderMinutes?: number
}

interface SourceMetrics {
	source: string
	requests: number
	failures: number
	timeouts: number
	rateLimited: number
	cacheHits: number
	cacheStale: number
	cacheMisses: number
	captures: number
	renderMs: number
}

function parseArgs(): Options {
	const args = process.argv.slice(2)
	const opts: Options = {
		lastHours: 24,
		dataset: 'MEASURE',
		json: false,
		check: false,
	}
	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		if (arg === '--last' || arg === '-l') opts.lastHours = parseDurationHours(args[++i])
		else if (arg === '--worker' || arg === '-w') opts.worker = args[++i]
		else if (arg === '--dataset' || arg === '-d') opts.dataset = args[++i]
		else if (arg === '--json') opts.json = true
		else if (arg === '--check') opts.check = true
		else if (arg === '--max-failure-rate') opts.maxFailureRate = Number(args[++i])
		else if (arg === '--max-timeout-rate') opts.maxTimeoutRate = Number(args[++i])
		else if (arg === '--min-cache-hit-rate') opts.minCacheHitRate = Number(args[++i])
		// --max-browser-minutes is the former name; kept as an alias.
		else if (arg === '--max-render-minutes' || arg === '--max-browser-minutes')
			opts.maxRenderMinutes = Number(args[++i])
		else if (arg === '--help' || arg === '-h') {
			console.log(
				[
					'Usage: npx tsx internal/scripts/fetch-screenshot-metrics.ts [options]',
					'',
					'Options:',
					'  --last, -l              Look-back window, e.g. 1h, 24h, 7d (default: 24h)',
					'  --worker, -w            Filter to one worker name, e.g. main-tldraw-multiplayer',
					'  --dataset, -d           Analytics Engine dataset name (default: MEASURE)',
					'  --json                  Print raw per-source metrics as JSON',
					'  --check                 Exit non-zero when a threshold below is breached',
					'  --max-failure-rate      Threshold, 0-1 (default with --check: 0.2)',
					'  --max-timeout-rate      Threshold, 0-1 (default with --check: 0.1)',
					'  --min-cache-hit-rate    Threshold, 0-1 (no default)',
					'  --max-render-minutes    Browser Run render minutes in the window (no default)',
					'                          (alias: --max-browser-minutes)',
					'  --help, -h              Show this help',
				].join('\n')
			)
			process.exit(0)
		} else {
			console.error(`Unknown option: ${arg}`)
			process.exit(1)
		}
	}
	if (opts.check) {
		opts.maxFailureRate ??= 0.2
		opts.maxTimeoutRate ??= 0.1
	}
	return opts
}

function parseDurationHours(value: string | undefined): number {
	const match = value?.match(/^(\d+)([hd])$/)
	if (!match) {
		console.error(`Invalid duration: ${value}. Use e.g. 6h, 24h, 7d.`)
		process.exit(1)
	}
	const amount = Number(match[1])
	return match[2] === 'd' ? amount * 24 : amount
}

function getAuth() {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
	const apiToken = process.env.CLOUDFLARE_ANALYTICS_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN
	if (!accountId || !apiToken) {
		console.error(
			'Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_API_TOKEN (or CLOUDFLARE_API_TOKEN).'
		)
		process.exit(1)
	}
	return { accountId, apiToken }
}

async function queryAnalyticsEngine(sql: string): Promise<Record<string, string | number>[]> {
	const { accountId, apiToken } = getAuth()
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${apiToken}` },
			body: sql,
		}
	)
	if (!response.ok) {
		throw new Error(`Analytics Engine query failed (${response.status}): ${await response.text()}`)
	}
	const result = (await response.json()) as { data: Record<string, string | number>[] }
	return result.data
}

// Only [0-9a-zA-Z_-] survives; every dynamic value interpolated into SQL goes through this.
function sqlSafe(value: string) {
	return value.replace(/[^0-9a-zA-Z_-]/g, '')
}

async function fetchMetrics(opts: Options): Promise<SourceMetrics[]> {
	const workerFilter = opts.worker ? `AND blob2 = '${sqlSafe(opts.worker)}'` : ''
	const where = `blob1 = '${EVENT_NAME}' ${workerFilter} AND timestamp > NOW() - INTERVAL '${opts.lastHours}' HOUR`
	const dataset = sqlSafe(opts.dataset)

	// blob3 = source, blob4 = cache status, blob5 = failure reason, blob6 = rate limit decision.
	// _sample_interval corrects for Analytics Engine sampling.
	const rows = await queryAnalyticsEngine(`
		SELECT
			blob3 AS source,
			blob4 AS cache,
			blob5 AS failure,
			blob6 AS rate_limit,
			SUM(_sample_interval) AS requests
		FROM ${dataset}
		WHERE ${where}
		GROUP BY source, cache, failure, rate_limit
		FORMAT JSON
	`)

	// double3 is the wall-clock render duration, positive only on rows that actually invoked Browser
	// Run (cache hits and pre-render failures leave it at -1). It replaces double4 (X-Browser-Ms-Used),
	// which the BROWSER binding no longer surfaces and is always -1.
	const spendRows = await queryAnalyticsEngine(`
		SELECT
			blob3 AS source,
			SUM(_sample_interval) AS captures,
			SUM(double3 * _sample_interval) AS render_ms
		FROM ${dataset}
		WHERE ${where} AND double3 > 0
		GROUP BY source
		FORMAT JSON
	`)

	const bySource = new Map<string, SourceMetrics>()
	const getSource = (source: string) => {
		let metrics = bySource.get(source)
		if (!metrics) {
			metrics = {
				source,
				requests: 0,
				failures: 0,
				timeouts: 0,
				rateLimited: 0,
				cacheHits: 0,
				cacheStale: 0,
				cacheMisses: 0,
				captures: 0,
				renderMs: 0,
			}
			bySource.set(source, metrics)
		}
		return metrics
	}

	for (const row of rows) {
		const metrics = getSource(String(row.source).replace(/^source:/, ''))
		const requests = Number(row.requests)
		const failure = String(row.failure).replace(/^failure:/, '')
		const cache = String(row.cache).replace(/^cache:/, '')
		metrics.requests += requests
		if (failure !== 'none') metrics.failures += requests
		if (/timeout|abort/i.test(failure)) metrics.timeouts += requests
		if (String(row.rate_limit) === 'rate_limit:blocked') metrics.rateLimited += requests
		if (cache === 'hit') metrics.cacheHits += requests
		if (cache === 'stale') metrics.cacheStale += requests
		if (cache === 'miss') metrics.cacheMisses += requests
	}
	for (const row of spendRows) {
		const metrics = getSource(String(row.source).replace(/^source:/, ''))
		metrics.captures += Number(row.captures)
		metrics.renderMs += Number(row.render_ms)
	}

	return [...bySource.values()].sort((a, b) => a.source.localeCompare(b.source))
}

function rate(part: number, total: number) {
	return total === 0 ? 0 : part / total
}

function formatPercent(value: number) {
	return `${(value * 100).toFixed(1)}%`
}

function main() {
	const opts = parseArgs()
	return fetchMetrics(opts).then((metrics) => {
		if (opts.json) {
			console.log(JSON.stringify(metrics, null, 2))
		} else {
			console.log(
				`Screenshot telemetry, last ${opts.lastHours}h${opts.worker ? ` (worker ${opts.worker})` : ''}:`
			)
			if (metrics.length === 0) console.log('  no events in window')
			for (const m of metrics) {
				console.log(
					[
						`  ${m.source.padEnd(6)}`,
						`requests ${m.requests}`,
						`failure ${formatPercent(rate(m.failures, m.requests))}`,
						`timeout ${formatPercent(rate(m.timeouts, m.requests))}`,
						`cache hit ${formatPercent(rate(m.cacheHits, m.cacheHits + m.cacheStale + m.cacheMisses))}`,
						`rate-limited ${m.rateLimited}`,
						`captures ${m.captures}`,
						`render ${(m.renderMs / 60_000).toFixed(1)}min`,
					].join('  ')
				)
			}
		}

		if (!opts.check) return

		const totals = metrics.reduce(
			(sum, m) => ({
				requests: sum.requests + m.requests,
				failures: sum.failures + m.failures,
				timeouts: sum.timeouts + m.timeouts,
				cacheHits: sum.cacheHits + m.cacheHits,
				cacheLookups: sum.cacheLookups + m.cacheHits + m.cacheStale + m.cacheMisses,
				renderMs: sum.renderMs + m.renderMs,
			}),
			{ requests: 0, failures: 0, timeouts: 0, cacheHits: 0, cacheLookups: 0, renderMs: 0 }
		)

		const breaches: string[] = []
		const failureRate = rate(totals.failures, totals.requests)
		const timeoutRate = rate(totals.timeouts, totals.requests)
		const cacheHitRate = rate(totals.cacheHits, totals.cacheLookups)
		const renderMinutes = totals.renderMs / 60_000
		if (opts.maxFailureRate !== undefined && failureRate > opts.maxFailureRate) {
			breaches.push(
				`failure rate ${formatPercent(failureRate)} > ${formatPercent(opts.maxFailureRate)}`
			)
		}
		if (opts.maxTimeoutRate !== undefined && timeoutRate > opts.maxTimeoutRate) {
			breaches.push(
				`timeout rate ${formatPercent(timeoutRate)} > ${formatPercent(opts.maxTimeoutRate)}`
			)
		}
		if (
			opts.minCacheHitRate !== undefined &&
			totals.cacheLookups > 0 &&
			cacheHitRate < opts.minCacheHitRate
		) {
			breaches.push(
				`cache hit rate ${formatPercent(cacheHitRate)} < ${formatPercent(opts.minCacheHitRate)}`
			)
		}
		if (opts.maxRenderMinutes !== undefined && renderMinutes > opts.maxRenderMinutes) {
			breaches.push(
				`Browser Run render time ${renderMinutes.toFixed(1)}min > ${opts.maxRenderMinutes}min`
			)
		}

		if (breaches.length > 0) {
			console.error(`ALERT: ${breaches.join('; ')}`)
			process.exit(1)
		}
		console.log('All thresholds OK')
	})
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
