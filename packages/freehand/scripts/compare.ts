/* eslint-disable no-console */
/**
 * Compare the candidate freehand implementation against the frozen baseline over the whole
 * corpus. Writes an HTML report with overlay images plus a JSON data file, and prints a summary.
 *
 *   yarn workspace @tldraw/freehand compare [--check]
 *
 * With --check, exits non-zero if the candidate deviates visibly from the baseline (used as a
 * regression gate while optimizing).
 */
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { CORPUS } from '../src/corpus/strokes'
import { renderHtmlReport, summarize } from '../src/harness/report'
import { compareCase } from '../src/harness/run'
import { MAX_DEVIATION_RATIO } from '../src/harness/thresholds'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'out')

const check = process.argv.includes('--check')

const compared = CORPUS.map(compareCase)
const metrics = compared.map((c) => c.metrics)
const summary = summarize(metrics)

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'report.html'), renderHtmlReport(compared, summary))
writeFileSync(join(outDir, 'data.json'), JSON.stringify({ summary, cases: metrics }, null, '\t'))

const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const pad = (s: string | number, n: number) => String(s).padStart(n)

console.log(
	`\ncase                        input   pts(b)   pts(c)   svg(b)   svg(c)   time     dev`
)
for (const m of [...metrics].sort((a, b) => b.maxDeviationRatio - a.maxDeviationRatio)) {
	console.log(
		`${m.id.padEnd(26)}${pad(m.inputPoints, 6)}${pad(m.baseline.points, 9)}${pad(
			m.candidate.points,
			9
		)}${pad(m.baseline.svgLength, 9)}${pad(m.candidate.svgLength, 9)}${pad(
			`${(m.baseline.ms / m.candidate.ms).toFixed(2)}x`,
			8
		)}${pad(`${m.deviation.max.toFixed(2)}px`, 9)}`
	)
}

console.log(`
${summary.cases} cases
speedup:            ${summary.speedup.toFixed(2)}x
outline points:     ${pct(-summary.pointReduction)}
svg path chars:     ${pct(-summary.svgLengthReduction)}
max deviation:      ${summary.maxDeviation.toFixed(3)}px (${pct(summary.maxDeviationRatio)} of stroke size)
mean deviation:     ${summary.meanDeviation.toFixed(4)}px

report: ${join(outDir, 'report.html')}
data:   ${join(outDir, 'data.json')}`)

if (check && summary.maxDeviationRatio > MAX_DEVIATION_RATIO) {
	console.error(
		`\nFAIL: max deviation ${pct(summary.maxDeviationRatio)} of stroke size exceeds the ${pct(
			MAX_DEVIATION_RATIO
		)} threshold`
	)
	process.exit(1)
}
