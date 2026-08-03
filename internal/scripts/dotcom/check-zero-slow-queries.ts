/**
 * Alert on Zero synced queries that are slow enough to break syncing.
 *
 * A query that takes longer to materialize than the sync connection's auth token lives doesn't just
 * feel slow — zero-cache reuses that token for the transform and push fetches behind the
 * connection, so the token expires mid-hydration, the connection is invalidated, the client retries
 * from scratch and never completes a first sync. That is what took tldraw.com down for every user
 * on Zero: `queries.reactions` materialized in ~150s against production data while every other
 * query stayed at ~250ms, and nothing surfaced it for hours. The view syncer had been logging it
 * the whole time.
 *
 * Query cost here is set by how deep a query's file-access gate sits, not by how much data the
 * feature has, so a query that is instant against a preview database can be pathological in
 * production. Neither unit tests nor the PR preview deploy can catch that. This can.
 *
 * Usage:
 *   yarn tsx internal/scripts/dotcom/check-zero-slow-queries.ts
 *   yarn tsx internal/scripts/dotcom/check-zero-slow-queries.ts --app staging-zero-vs --last 2h
 *   FLY_TOKEN=... yarn tsx internal/scripts/dotcom/check-zero-slow-queries.ts --threshold 10000
 *
 * Exits 1 when anything breaches the threshold, so CI marks the run red whether or not a Discord
 * webhook is configured.
 */
import { parseDuration, queryFlyLogs } from '../fly-common'
import { Discord } from '../lib/discord'
import { nicelog } from '../lib/nicelog'

/**
 * Default alert threshold. Well clear of a healthy query (~250-300ms in production) and below
 * Clerk's 60s session-token lifetime, which is the point at which slow stops meaning slow and
 * starts meaning the connection dies. Lower this as headroom improves; don't raise it above the
 * token lifetime.
 */
const DEFAULT_THRESHOLD_MS = 30_000
const DEFAULT_APP = 'production-zero-vs'
const DEFAULT_WINDOW = '1h'
/** Fly caps a single response; slow-query lines are rare so this is generous. */
const LOG_LIMIT = 5000

interface SlowQuery {
	queryName: string
	table: string
	durationMs: number
	clientGroupID: string
}

function parseArgs(argv: string[]) {
	const opts: Record<string, string> = {}
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--app' || argv[i] === '-a') opts.app = argv[++i]
		else if (argv[i] === '--last' || argv[i] === '-l') opts.last = argv[++i]
		else if (argv[i] === '--threshold' || argv[i] === '-t') opts.threshold = argv[++i]
		else if (argv[i] === '--token') opts.token = argv[++i]
		else if (argv[i] === '--help' || argv[i] === '-h') opts.help = 'true'
	}
	return opts
}

/**
 * Pull `Slow query materialization <ms>` warnings. zero-cache logs these as JSON in `_msg`, with
 * the query's identity alongside the message.
 */
export function parseSlowQueries(messages: string[], thresholdMs: number): SlowQuery[] {
	const slow: SlowQuery[] = []
	for (const raw of messages) {
		let entry: any
		try {
			entry = JSON.parse(raw)
		} catch {
			continue
		}
		const message = String(entry?.message ?? '')
		if (!message.startsWith('Slow query materialization')) continue
		const durationMs = Number(message.split(' ').at(-1))
		if (!Number.isFinite(durationMs) || durationMs < thresholdMs) continue
		slow.push({
			// an ad-hoc (non-synced) query has no name; report the table so it's still identifiable
			queryName: entry?.queryName ?? '(unnamed)',
			table: entry?.table ?? '(unknown)',
			durationMs,
			clientGroupID: entry?.clientGroupID ?? '(unknown)',
		})
	}
	return slow
}

/** Worst-first summary, one line per distinct query. */
export function summarize(slow: SlowQuery[]): string[] {
	const byQuery = new Map<string, SlowQuery[]>()
	for (const s of slow) {
		const key = `${s.queryName} (${s.table})`
		byQuery.set(key, [...(byQuery.get(key) ?? []), s])
	}
	return [...byQuery.entries()]
		.map(([key, entries]) => {
			const worst = Math.max(...entries.map((e) => e.durationMs))
			const clients = new Set(entries.map((e) => e.clientGroupID)).size
			return {
				worst,
				line: `**${key}** — ${entries.length} over threshold, worst ${(worst / 1000).toFixed(1)}s, ${clients} client group${clients === 1 ? '' : 's'}`,
			}
		})
		.sort((a, b) => b.worst - a.worst)
		.map((s) => s.line)
}

async function main() {
	const opts = parseArgs(process.argv.slice(2))
	if (opts.help) {
		nicelog(
			[
				'Usage: yarn tsx internal/scripts/dotcom/check-zero-slow-queries.ts [options]',
				'',
				`  --app, -a        Fly app to scan (default: ${DEFAULT_APP})`,
				`  --last, -l       Window to scan, e.g. 30m, 2h (default: ${DEFAULT_WINDOW})`,
				`  --threshold, -t  Alert threshold in ms (default: ${DEFAULT_THRESHOLD_MS})`,
				'  --token          Fly API token (falls back to FLY_TOKEN)',
				'',
				'Posts to DISCORD_HEALTH_WEBHOOK_URL when set. Exits 1 if anything breaches.',
			].join('\n')
		)
		return
	}

	const app = opts.app ?? DEFAULT_APP
	const thresholdMs = opts.threshold ? Number(opts.threshold) : DEFAULT_THRESHOLD_MS
	const windowMs = parseDuration(opts.last ?? DEFAULT_WINDOW, 'ms')
	const end = new Date()
	const start = new Date(end.getTime() - windowMs)

	const entries = await queryFlyLogs({
		app,
		start: start.toISOString(),
		end: end.toISOString(),
		filter: '"Slow query materialization"',
		limit: LOG_LIMIT,
		token: opts.token,
	})
	const slow = parseSlowQueries(
		entries.map((e) => e._msg),
		thresholdMs
	)

	const window = opts.last ?? DEFAULT_WINDOW
	if (slow.length === 0) {
		nicelog(`✅ ${app}: no query slower than ${thresholdMs}ms in the last ${window}`)
		return
	}

	const summary = summarize(slow)
	nicelog(`🚨 ${app}: ${slow.length} slow query materializations in the last ${window}`)
	for (const line of summary) nicelog(`   ${line.replace(/\*\*/g, '')}`)

	const webhookUrl = process.env.DISCORD_HEALTH_WEBHOOK_URL
	if (webhookUrl) {
		const discord = new Discord({ webhookUrl, shouldNotify: true, messagePrefix: '[ZERO]' })
		await discord.message(
			[
				`${Discord.AT_TEAM_MENTION} **Slow Zero queries on \`${app}\`**`,
				`${slow.length} materializations over ${thresholdMs}ms in the last ${window}:`,
				...summary.map((l) => `• ${l}`),
				'',
				'A query slower than the auth token lifetime invalidates the sync connection, so clients',
				'never finish a first sync. See `queries.reactions` in dotcom-shared for the last one.',
			].join('\n'),
			{ always: true }
		)
	} else {
		nicelog('(DISCORD_HEALTH_WEBHOOK_URL not set — not posting)')
	}

	process.exit(1)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
