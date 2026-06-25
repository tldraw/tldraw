import fs from 'fs'
import path from 'path'

// ESM-safe __dirname (matches baseline-manager.ts).
const here = path.dirname(new URL(import.meta.url).pathname)
const BASELINE_DIR = path.join(here, '..', 'baselines', 'perf')

// Perf numbers are noisy run-to-run even on a fixed CI runner, so a metric is only rewritten when it
// moves more than this fraction. That keeps the committed baseline — and its PR diffs — reflecting
// real changes instead of jitter: a regenerate with no real change produces no diff.
const NOISE_TOLERANCE = 0.15

// Bucket percentages round to whole numbers (sub-1% ones are pure jitter); timings keep one decimal.
function round(key: string, value: number) {
	return key.includes('%') ? Math.round(value) : Math.round(value * 10) / 10
}

/**
 * Record a set of perf numbers against a committed baseline so the cost/savings of a change show up
 * in a PR's diff.
 *
 * - With `PERF_UPDATE_BASELINE` set (CI, via the update-snapshots workflow on a consistent runner),
 *   it writes `e2e/baselines/perf/<name>.json` — but keeps each committed value unless the metric
 *   moved past NOISE_TOLERANCE, so a regenerate diffs only on real changes, not noise.
 * - Otherwise it reads the committed baseline and logs the per-metric delta — it does NOT assert and
 *   does NOT write, so ordinary runs never fail on perf noise or dirty the tree.
 */
export function recordPerfBaseline(name: string, data: Record<string, number>) {
	const file = path.join(BASELINE_DIR, `${name}.json`)
	const current: Record<string, number> = {}
	for (const [k, v] of Object.entries(data)) current[k] = round(k, v)

	if (process.env.PERF_UPDATE_BASELINE) {
		let next = current
		if (fs.existsSync(file)) {
			const old = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, number>
			next = {}
			for (const [k, v] of Object.entries(current)) {
				const o = typeof old[k] === 'number' ? round(k, old[k]) : undefined
				// Keep the committed value unless this metric moved past the noise floor.
				const moved = o === undefined || o === 0 || Math.abs(v - o) / Math.abs(o) >= NOISE_TOLERANCE
				next[k] = moved ? v : o
			}
		}
		fs.mkdirSync(BASELINE_DIR, { recursive: true })
		fs.writeFileSync(file, JSON.stringify(next, null, '\t') + '\n', 'utf-8')
		// eslint-disable-next-line no-console
		console.log(`[perf-baseline] updated ${name}`)
		return
	}

	if (!fs.existsSync(file)) {
		// eslint-disable-next-line no-console
		console.log(
			`[perf-baseline] no committed baseline for "${name}" yet — set PERF_UPDATE_BASELINE=1 to create it`
		)
		return
	}

	const baseline = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, number>
	const rows = Object.entries(current).map(([k, v]) => {
		const b = baseline[k]
		const delta =
			typeof b === 'number' && b !== 0
				? `${v - b >= 0 ? '+' : ''}${(((v - b) / b) * 100).toFixed(1)}%`
				: 'new'
		return `  ${k.padEnd(24)} ${String(v).padStart(10)}   (baseline ${b ?? '—'}, ${delta})`
	})
	// eslint-disable-next-line no-console
	console.log(`[perf-baseline] ${name} vs committed baseline:\n${rows.join('\n')}`)
}
