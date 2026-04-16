/**
 * Fetch logs from Fly.io's VictoriaLogs API.
 *
 * Usage:
 *   npx tsx internal/scripts/fetch-fly-logs.ts [options]
 *
 * App names:
 *   production-zero-rm    Production replication manager
 *   production-zero-vs    Production view syncer
 *   staging-zero-rm       Staging replication manager
 *   staging-zero-vs       Staging view syncer
 *   pr-NNNN-zero-cache    PR preview (single zero-cache process)
 *
 * Examples:
 *   npx tsx internal/scripts/fetch-fly-logs.ts --app production-zero-rm --last 2h
 *   npx tsx internal/scripts/fetch-fly-logs.ts --app production-zero-rm --last 30m --filter "Purged"
 *   npx tsx internal/scripts/fetch-fly-logs.ts --app production-zero-rm --start 2026-04-15T15:00:00Z --end 2026-04-15T18:00:00Z
 *   npx tsx internal/scripts/fetch-fly-logs.ts --app production-zero-rm --last 1h --filter "NOT DEBUG" -o logs.jsonl
 *   npx tsx internal/scripts/fetch-fly-logs.ts --app production-zero-rm --last 6h --filter "Purged" --pretty
 *   FLY_TOKEN=fo1_xxx npx tsx internal/scripts/fetch-fly-logs.ts --app production-zero-rm --last 1h
 *   npx tsx internal/scripts/fetch-fly-logs.ts --token fo1_xxx --app production-zero-rm --last 1h
 */

const ORG_SLUG = 'tldraw-gb-ltd'
const BASE_URL = `https://api.fly.io/victorialogs/${ORG_SLUG}/select/logsql/query`

function getToken(explicit?: string): string {
	if (explicit) return explicit
	if (process.env.FLY_TOKEN) return process.env.FLY_TOKEN
	console.error(
		'No token provided. Use --token, FLY_TOKEN env var, or create one with: fly tokens create readonly'
	)
	process.exit(1)
}

function parseDuration(s: string): number {
	const match = s.match(/^(\d+)(m|h|d)$/)
	if (!match) {
		console.error(`Invalid duration: ${s}. Use e.g. 30m, 2h, 1d`)
		process.exit(1)
	}
	const n = parseInt(match[1])
	const unit = match[2]
	const multipliers: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 }
	return n * multipliers[unit]
}

function parseArgs() {
	const args = process.argv.slice(2)
	const opts: Record<string, string> = {}
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--token' || args[i] === '-t') opts.token = args[++i]
		else if (args[i] === '--app' || args[i] === '-a') opts.app = args[++i]
		else if (args[i] === '--start') opts.start = args[++i]
		else if (args[i] === '--end') opts.end = args[++i]
		else if (args[i] === '--last' || args[i] === '-l') opts.last = args[++i]
		else if (args[i] === '--filter' || args[i] === '-f') opts.filter = args[++i]
		else if (args[i] === '--limit') opts.limit = args[++i]
		else if (args[i] === '--output' || args[i] === '-o') opts.output = args[++i]
		else if (args[i] === '--pretty' || args[i] === '-p') opts.pretty = 'true'
		else if (args[i] === '--help' || args[i] === '-h') {
			console.log(
				[
					'Usage: npx tsx internal/scripts/fetch-fly-logs.ts [options]',
					'',
					'Options:',
					'  --token, -t    Fly API token (falls back to FLY_TOKEN env var)',
					'  --app, -a      Fly app name (required)',
					'  --last, -l     Duration to look back, e.g. 30m, 2h, 1d (default: 1h)',
					'  --start        Start time (ISO 8601), overrides --last',
					'  --end          End time (ISO 8601), defaults to now',
					'  --filter, -f   Additional LogsQL filter, e.g. "Purged", "NOT DEBUG"',
					'  --limit        Max lines (default: unlimited)',
					'  --output, -o   Write to file instead of stdout',
					'  --pretty, -p   Pretty-print: timestamp + message only',
					'  --help, -h     Show this help',
				].join('\n')
			)
			process.exit(0)
		} else {
			console.error(`Unknown option: ${args[i]}`)
			process.exit(1)
		}
	}
	if (!opts.app) {
		console.error('--app is required')
		process.exit(1)
	}
	return opts
}

async function main() {
	const opts = parseArgs()

	const now = new Date()
	const end = opts.end ?? now.toISOString()
	let start: string
	if (opts.start) {
		start = opts.start
	} else {
		const ms = parseDuration(opts.last ?? '1h')
		start = new Date(now.getTime() - ms).toISOString()
	}

	let query = `fly.app.name: ${opts.app}`
	if (opts.filter) query += ` AND ${opts.filter}`

	const params = new URLSearchParams({ query, start, end })
	if (opts.limit) params.set('limit', opts.limit)

	const token = getToken(opts.token)
	const url = `${BASE_URL}?${params}`

	const res = await fetch(url, { headers: { Authorization: token } })
	if (!res.ok) {
		console.error(`HTTP ${res.status}: ${await res.text()}`)
		process.exit(1)
	}

	const body = await res.text()
	if (!body.trim()) {
		console.error('No logs found.')
		process.exit(0)
	}

	let output: string
	if (opts.pretty) {
		output = body
			.trim()
			.split('\n')
			.map((line) => {
				const entry = JSON.parse(line)
				return `${entry._time}  ${entry._msg}`
			})
			.sort()
			.join('\n')
	} else {
		output = body
	}

	if (opts.output) {
		const fs = await import('fs')
		fs.writeFileSync(opts.output, output + '\n')
		const lines = output.trim().split('\n').length
		console.error(`Wrote ${lines} lines to ${opts.output}`)
	} else {
		process.stdout.write(output + '\n')
	}
}

main()
