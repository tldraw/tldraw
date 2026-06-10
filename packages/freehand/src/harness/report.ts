import { CaseMetrics } from './metrics'
import { renderOverlaySvg, renderSingleSvg } from './render'
import { ComparedCase } from './run'

export interface Summary {
	cases: number
	/** Sum of baseline time / sum of candidate time. >1 means the candidate is faster. */
	speedup: number
	/** 1 - (candidate points / baseline points). >0 means the candidate emits fewer points. */
	pointReduction: number
	/** 1 - (candidate svg chars / baseline svg chars). */
	svgLengthReduction: number
	maxDeviation: number
	meanDeviation: number
	maxDeviationRatio: number
}

export function summarize(all: CaseMetrics[]): Summary {
	const sum = (f: (m: CaseMetrics) => number) => all.reduce((acc, m) => acc + f(m), 0)
	return {
		cases: all.length,
		speedup: sum((m) => m.baseline.ms) / sum((m) => m.candidate.ms),
		pointReduction: 1 - sum((m) => m.candidate.points) / sum((m) => m.baseline.points),
		svgLengthReduction: 1 - sum((m) => m.candidate.svgLength) / sum((m) => m.baseline.svgLength),
		maxDeviation: Math.max(...all.map((m) => m.deviation.max)),
		meanDeviation: sum((m) => m.deviation.mean) / all.length,
		maxDeviationRatio: Math.max(...all.map((m) => m.maxDeviationRatio)),
	}
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const fixed = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v))

export function renderHtmlReport(compared: ComparedCase[], summary: Summary): string {
	const rows = [...compared].sort(
		(a, b) => b.metrics.maxDeviationRatio - a.metrics.maxDeviationRatio
	)

	const cards = rows
		.map(({ metrics: m, baselineOutput, candidateOutput }) => {
			const overlay = renderOverlaySvg(baselineOutput, candidateOutput, m.strokeSize)
			const base = renderSingleSvg(baselineOutput, m.strokeSize)
			const cand = renderSingleSvg(candidateOutput, m.strokeSize)
			return `
<div class="case">
	<h2>${m.id} <span class="kind">${m.kind}</span></h2>
	<table>
		<tr><th></th><th>baseline</th><th>candidate</th><th>delta</th></tr>
		<tr><td>points</td><td>${m.baseline.points}</td><td>${m.candidate.points}</td><td>${pct(
			m.candidate.points / m.baseline.points - 1
		)}</td></tr>
		<tr><td>svg chars</td><td>${m.baseline.svgLength}</td><td>${m.candidate.svgLength}</td><td>${pct(
			m.candidate.svgLength / m.baseline.svgLength - 1
		)}</td></tr>
		<tr><td>time (ms)</td><td>${fixed(m.baseline.ms)}</td><td>${fixed(m.candidate.ms)}</td><td>${fixed(
			m.baseline.ms / m.candidate.ms,
			2
		)}x</td></tr>
		<tr><td>deviation</td><td colspan="3">max ${fixed(m.deviation.max)}px (${pct(
			m.maxDeviationRatio
		)} of stroke size), mean ${fixed(m.deviation.mean)}px</td></tr>
	</table>
	<div class="images">
		<figure><figcaption>overlay (black = baseline, red = candidate)</figcaption>${overlay}</figure>
		<figure><figcaption>baseline</figcaption>${base}</figure>
		<figure><figcaption>candidate</figcaption>${cand}</figure>
	</div>
</div>`
		})
		.join('\n')

	return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Freehand ink comparison</title>
<style>
	body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; background: #fafafa; }
	.summary { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
	.summary b { font-size: 18px; }
	.case { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
	.kind { font-size: 12px; color: #888; font-weight: normal; }
	h2 { font-size: 15px; margin: 0 0 8px; }
	table { border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
	td, th { border: 1px solid #eee; padding: 2px 8px; text-align: right; }
	th:first-child, td:first-child { text-align: left; }
	.images { display: flex; gap: 16px; flex-wrap: wrap; }
	figure { margin: 0; }
	figcaption { font-size: 11px; color: #888; margin-bottom: 4px; }
	svg { background: #fff; border: 1px solid #eee; }
</style>
</head>
<body>
<div class="summary">
	<b>Freehand ink: candidate vs baseline</b><br>
	${summary.cases} cases ·
	speedup ${fixed(summary.speedup, 2)}x ·
	points ${pct(-summary.pointReduction)} ·
	svg chars ${pct(-summary.svgLengthReduction)} ·
	max deviation ${fixed(summary.maxDeviation)}px (${pct(summary.maxDeviationRatio)} of stroke size) ·
	mean deviation ${fixed(summary.meanDeviation)}px
</div>
${cards}
</body>
</html>`
}
