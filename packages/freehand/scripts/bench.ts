/* eslint-disable no-console */
/**
 * Benchmark the candidate freehand implementation against the frozen baseline.
 *
 *   yarn workspace @tldraw/freehand bench [--json]
 *
 * Reports per-case ops/sec for the full render pipeline (input points -> SVG path data), which
 * is what runs on every pointer move while the user is drawing.
 */
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { CORPUS, CorpusCase } from '../src/corpus/strokes'
import { baselineImpl, candidateImpl, InkImplementation, runCase } from '../src/harness/run'

const here = dirname(fileURLToPath(import.meta.url))

interface BenchResult {
	id: string
	kind: string
	inputPoints: number
	baselineOpsPerSec: number
	candidateOpsPerSec: number
	speedup: number
}

/**
 * Measure ops/sec with warmup and multiple sampling rounds, keeping the best round. Taking the
 * max over rounds filters out GC pauses and other one-off interference.
 */
function opsPerSec(fn: () => void, minRoundMs = 60, rounds = 5): number {
	// Warmup: let the JIT settle on the hot path.
	const warmupEnd = performance.now() + 30
	while (performance.now() < warmupEnd) fn()

	let best = 0
	for (let r = 0; r < rounds; r++) {
		let ops = 0
		const start = performance.now()
		let now = start
		while (now - start < minRoundMs) {
			fn()
			ops++
			now = performance.now()
		}
		const rate = (ops / (now - start)) * 1000
		if (rate > best) best = rate
	}
	return best
}

function benchCase(c: CorpusCase): BenchResult {
	const run = (impl: InkImplementation) => opsPerSec(() => runCase(impl, c))
	// Interleave to give both implementations the same thermal/GC conditions.
	const b1 = run(baselineImpl)
	const c1 = run(candidateImpl)
	const b2 = run(baselineImpl)
	const c2 = run(candidateImpl)
	const baseline = Math.max(b1, b2)
	const candidate = Math.max(c1, c2)
	return {
		id: c.id,
		kind: c.kind,
		inputPoints: c.points.length,
		baselineOpsPerSec: baseline,
		candidateOpsPerSec: candidate,
		speedup: candidate / baseline,
	}
}

const results: BenchResult[] = []
console.log(`\ncase                        input      baseline     candidate   speedup`)
for (const c of CORPUS) {
	const r = benchCase(c)
	results.push(r)
	console.log(
		`${r.id.padEnd(26)}${String(r.inputPoints).padStart(6)}${(
			Math.round(r.baselineOpsPerSec).toLocaleString('en-US') + '/s'
		).padStart(14)}${(Math.round(r.candidateOpsPerSec).toLocaleString('en-US') + '/s').padStart(
			14
		)}${(r.speedup.toFixed(2) + 'x').padStart(10)}`
	)
}

const geomean = Math.exp(results.reduce((acc, r) => acc + Math.log(r.speedup), 0) / results.length)
const buckets: Record<string, BenchResult[]> = { short: [], medium: [], long: [] }
for (const r of results) {
	buckets[r.inputPoints < 50 ? 'short' : r.inputPoints < 500 ? 'medium' : 'long'].push(r)
}
console.log(`\ngeomean speedup: ${geomean.toFixed(2)}x`)
for (const [bucket, rs] of Object.entries(buckets)) {
	if (rs.length === 0) continue
	const g = Math.exp(rs.reduce((acc, r) => acc + Math.log(r.speedup), 0) / rs.length)
	console.log(`  ${bucket.padEnd(7)} (${String(rs.length).padStart(2)} cases): ${g.toFixed(2)}x`)
}

if (process.argv.includes('--json')) {
	const outDir = join(here, '..', 'out')
	mkdirSync(outDir, { recursive: true })
	writeFileSync(join(outDir, 'bench.json'), JSON.stringify({ geomean, results }, null, '\t'))
	console.log(`\nwrote ${join(outDir, 'bench.json')}`)
}
