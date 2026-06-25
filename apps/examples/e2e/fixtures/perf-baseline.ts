import fs from 'fs'
import path from 'path'

// ESM-safe __dirname (matches baseline-manager.ts).
const here = path.dirname(new URL(import.meta.url).pathname)
const BASELINE_DIR = path.join(here, '..', 'baselines', 'perf')

/**
 * Record a set of perf numbers against a committed baseline so the cost/savings of a change show up
 * in a PR's diff.
 *
 * - With `PERF_UPDATE_BASELINE` set (CI, via the update-snapshots workflow on a consistent runner),
 *   it (over)writes the committed baseline file `e2e/baselines/perf/<name>.json`.
 * - Otherwise it reads the committed baseline and logs the per-metric delta — it does NOT assert and
 *   does NOT write, so ordinary runs never fail on perf noise or dirty the tree.
 *
 * Because the file only changes on a deliberate CI update, a "fix" PR that regenerates the baseline
 * shows exactly what moved (and by how much) in its diff, next to a known-consistent "before".
 */
export function recordPerfBaseline(name: string, data: Record<string, number>) {
	const file = path.join(BASELINE_DIR, `${name}.json`)

	if (process.env.PERF_UPDATE_BASELINE) {
		fs.mkdirSync(BASELINE_DIR, { recursive: true })
		fs.writeFileSync(file, JSON.stringify(data, null, '\t') + '\n', 'utf-8')
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
	const rows = Object.entries(data).map(([k, v]) => {
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
