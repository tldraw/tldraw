import fs from 'fs'
import path from 'path'

// ESM-safe __dirname (matches baseline-manager.ts).
const here = path.dirname(new URL(import.meta.url).pathname)
const BASELINE_DIR = path.join(here, '..', 'baselines', 'perf')

// Even on a fixed CI runner a metric still drifts run-to-run, so a metric is only rewritten when it
// moves more than this fraction. Combined with the median over runs (below), that keeps the
// committed baseline — and its PR diffs — reflecting real changes instead of jitter: a regenerate
// with no real change produces no diff. Tunable; the median does most of the noise reduction.
const NOISE_TOLERANCE = 0.08

/** Middle value of a list (mean of the two middle values when even); ignores NaN/non-numbers. */
export function median(values: number[]): number {
	const xs = values.filter((v) => typeof v === 'number' && !Number.isNaN(v)).sort((a, b) => a - b)
	if (xs.length === 0) return NaN
	const mid = Math.floor(xs.length / 2)
	return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2
}

/**
 * Record a set of perf numbers against a committed baseline so the cost/savings of a change show up
 * in a PR's diff.
 *
 * Pass several runs (an array of sample sets) and each metric is reduced to the **median** across
 * them, so one slow run (a GC pause, a noisy CI neighbour) can't move the committed value. A single
 * sample set is also accepted (treated as one run). Values are recorded at full precision — the
 * median plus NOISE_TOLERANCE handle stability, so no lossy rounding is applied.
 *
 * - With `PERF_UPDATE_BASELINE` set (CI, via the update-snapshots workflow on a consistent runner),
 *   it writes `e2e/baselines/perf/<name>.json` — but keeps each committed value unless the metric
 *   moved past NOISE_TOLERANCE, so a regenerate diffs only on real changes, not noise.
 * - Otherwise it reads the committed baseline and logs the per-metric delta — it does NOT assert and
 *   does NOT write, so ordinary runs never fail on perf noise or dirty the tree.
 *
 * Returns the per-metric median, so callers can assert smoke ceilings against the same number.
 */
export function recordPerfBaseline(
	name: string,
	runs: Record<string, number> | Record<string, number>[]
): Record<string, number> {
	const samples = Array.isArray(runs) ? runs : [runs]
	const file = path.join(BASELINE_DIR, `${name}.json`)

	// Median per metric across the runs.
	const keys = [...new Set(samples.flatMap((s) => Object.keys(s)))]
	const current: Record<string, number> = {}
	for (const k of keys) current[k] = median(samples.map((s) => s[k]))

	if (process.env.PERF_UPDATE_BASELINE) {
		let next = current
		if (fs.existsSync(file)) {
			const old = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, number>
			next = {}
			for (const [k, v] of Object.entries(current)) {
				const o = typeof old[k] === 'number' ? old[k] : undefined
				// Keep the committed value unless this metric moved past the noise floor.
				const moved = o === undefined || o === 0 || Math.abs(v - o) / Math.abs(o) >= NOISE_TOLERANCE
				next[k] = moved ? v : o
			}
		}
		fs.mkdirSync(BASELINE_DIR, { recursive: true })
		fs.writeFileSync(file, JSON.stringify(next, null, '\t') + '\n', 'utf-8')
		// eslint-disable-next-line no-console
		console.log(`[perf-baseline] updated ${name} (median of ${samples.length} run(s))`)
		return current
	}

	if (!fs.existsSync(file)) {
		// eslint-disable-next-line no-console
		console.log(
			`[perf-baseline] no committed baseline for "${name}" yet — set PERF_UPDATE_BASELINE=1 to create it`
		)
		return current
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
	console.log(
		`[perf-baseline] ${name} vs committed baseline (median of ${samples.length} run(s)):\n${rows.join('\n')}`
	)
	return current
}
