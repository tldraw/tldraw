/**
 * Fetch CPU and memory metrics from Fly.io's Prometheus API.
 *
 * Usage:
 *   npx tsx internal/scripts/fetch-fly-metrics.ts [options]
 *
 * Examples:
 *   npx tsx internal/scripts/fetch-fly-metrics.ts --app production-zero-rm --last 1h
 *   npx tsx internal/scripts/fetch-fly-metrics.ts --app production-zero-rm --last 6h --step 5m
 *   npx tsx internal/scripts/fetch-fly-metrics.ts --token fo1_xxx --app production-zero-rm --last 2h
 *   FLY_TOKEN=fo1_xxx npx tsx internal/scripts/fetch-fly-metrics.ts --app production-zero-rm --last 1h
 *
 * See fly-common.ts for app names and token configuration.
 */

import { FLY_ORG_SLUG, getFlyToken, parseDuration } from './fly-common'

const PROM_URL = `https://api.fly.io/prometheus/${FLY_ORG_SLUG}/api/v1/query_range`

function parseArgs() {
	const args = process.argv.slice(2)
	const opts: Record<string, string> = {}
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--token' || args[i] === '-t') opts.token = args[++i]
		else if (args[i] === '--app' || args[i] === '-a') opts.app = args[++i]
		else if (args[i] === '--last' || args[i] === '-l') opts.last = args[++i]
		else if (args[i] === '--step' || args[i] === '-s') opts.step = args[++i]
		else if (args[i] === '--output' || args[i] === '-o') opts.output = args[++i]
		else if (args[i] === '--help' || args[i] === '-h') {
			console.log(
				[
					'Usage: npx tsx internal/scripts/fetch-fly-metrics.ts [options]',
					'',
					'Options:',
					'  --token, -t    Fly API token (falls back to FLY_TOKEN env var)',
					'  --app, -a      Fly app name (required)',
					'  --last, -l     Duration to look back, e.g. 30m, 2h, 1d (default: 1h)',
					'  --step, -s     Query resolution step, e.g. 1m, 5m (default: 1m)',
					'  --output, -o   Write to file instead of stdout',
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

interface PromResult {
	metric: Record<string, string>
	values: [number, string][]
}

async function queryRange(
	token: string,
	query: string,
	start: number,
	end: number,
	step: string
): Promise<PromResult[]> {
	const params = new URLSearchParams({
		query,
		start: start.toString(),
		end: end.toString(),
		step,
	})
	const res = await fetch(`${PROM_URL}?${params}`, {
		headers: { Authorization: `FlyV1 ${token}` },
	})
	if (!res.ok) {
		console.error(`HTTP ${res.status}: ${await res.text()}`)
		process.exit(1)
	}
	const json = (await res.json()) as { data: { result: PromResult[] } }
	return json.data.result
}

function formatBytes(bytes: number): string {
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}GB`
	if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)}MB`
	return `${(bytes / 1e3).toFixed(1)}KB`
}

function formatTime(epoch: number): string {
	return new Date(epoch * 1000)
		.toISOString()
		.replace('T', ' ')
		.replace(/\.\d+Z/, 'Z')
}

function seriesLabel(metric: Record<string, string>): string {
	const instance = metric.instance ?? 'unknown'
	const region = metric.region ?? ''
	return region ? `${instance} (${region})` : instance
}

async function main() {
	const opts = parseArgs()
	const token = getFlyToken(opts.token)
	const step = opts.step ?? '1m'

	const now = Math.floor(Date.now() / 1000)
	const rangeSec = parseDuration(opts.last ?? '1h')
	const start = now - rangeSec
	const app = opts.app

	// Query A: CPU usage % (excludes idle + steal, normalized by core count)
	const cpuQuery = `sum(increase(fly_instance_cpu{app="${app}", mode!="idle", mode!="steal"}[60s]))by(instance, region)/60 / sum(count(fly_instance_cpu{app="${app}", mode="idle"})without(cpu))by(instance, region)`
	// Query B: CPU baseline (shared CPU fraction)
	const baselineQuery = `mode(fly_instance_cpu_baseline{app="${app}"}) / mode(count(fly_instance_cpu{app="${app}", mode="idle"})without(cpu_id, mode)) * 100`
	// Query C: CPU throttle indicator
	const throttleQuery = `avg(rate(fly_instance_cpu_throttle{app="${app}"}[60s])) / count(fly_instance_cpu{app="${app}", mode="idle"})without(cpu_id, mode)`
	// Memory used
	const memQuery = `fly_instance_memory_mem_total{app="${app}"} - fly_instance_memory_mem_available{app="${app}"}`
	const memTotalQuery = `fly_instance_memory_mem_total{app="${app}"}`

	const [cpuResults, baselineResults, throttleResults, memResults, memTotalResults] =
		await Promise.all([
			queryRange(token, cpuQuery, start, now, step),
			queryRange(token, baselineQuery, start, now, step),
			queryRange(token, throttleQuery, start, now, step),
			queryRange(token, memQuery, start, now, step),
			queryRange(token, memTotalQuery, start, now, step),
		])

	if (!cpuResults.length && !memResults.length) {
		console.error('No metrics found.')
		process.exit(0)
	}

	const lines: string[] = []
	lines.push(`Metrics for ${app} (last ${opts.last ?? '1h'}, step ${step})`)

	// CPU time series
	for (const series of cpuResults) {
		const label = seriesLabel(series.metric)
		const values = series.values.map((v) => parseFloat(v[1]))
		const avg = values.reduce((a, b) => a + b, 0) / values.length
		const max = Math.max(...values)
		lines.push('')
		lines.push(`--- CPU [${label}] avg=${avg.toFixed(1)}% max=${max.toFixed(1)}% ---`)
		for (const [ts, val] of series.values) {
			lines.push(`  ${formatTime(ts)}  ${parseFloat(val).toFixed(1)}%`)
		}
	}

	// CPU baseline
	for (const series of baselineResults) {
		const label = seriesLabel(series.metric)
		const values = series.values.map((v) => parseFloat(v[1]))
		const avg = values.reduce((a, b) => a + b, 0) / values.length
		lines.push('')
		lines.push(`--- CPU baseline [${label}] avg=${avg.toFixed(1)}% ---`)
	}

	// CPU throttle
	for (const series of throttleResults) {
		const values = series.values.map((v) => parseFloat(v[1]))
		const throttled = values.filter((v) => v > 1).length
		if (throttled > 0) {
			lines.push('')
			lines.push(`--- CPU throttled: ${throttled}/${values.length} samples ---`)
		}
	}

	// Memory time series
	for (const series of memResults) {
		const label = seriesLabel(series.metric)
		const values = series.values.map((v) => parseFloat(v[1]))
		const avg = values.reduce((a, b) => a + b, 0) / values.length
		const max = Math.max(...values)
		const totalSeries = memTotalResults.find((t) => t.metric.instance === series.metric.instance)
		const total = totalSeries?.values[0] ? parseFloat(totalSeries.values[0][1]) : 0
		const totalStr = total ? ` / ${formatBytes(total)}` : ''
		lines.push('')
		lines.push(`--- MEM [${label}] avg=${formatBytes(avg)} max=${formatBytes(max)}${totalStr} ---`)
		for (const [ts, val] of series.values) {
			const pct = total ? ` (${((parseFloat(val) / total) * 100).toFixed(1)}%)` : ''
			lines.push(`  ${formatTime(ts)}  ${formatBytes(parseFloat(val))}${pct}`)
		}
	}

	const output = lines.join('\n')

	if (opts.output) {
		const fs = await import('fs')
		fs.writeFileSync(opts.output, output + '\n')
		console.error(`Wrote to ${opts.output}`)
	} else {
		process.stdout.write(output + '\n')
	}
}

main()
