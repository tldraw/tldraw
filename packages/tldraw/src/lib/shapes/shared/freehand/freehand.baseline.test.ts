import { VecLike } from '@tldraw/editor'
import { describe, expect, it } from 'vitest'
import { getFreehandOptions, getHighlightFreehandSettings } from '../../draw/getPath'
import { getStroke } from './getStroke'
import { getStrokePoints } from './getStrokePoints'
import { getSvgPathFromStrokePoints } from './svg'
import { svgInk } from './svgInk'
import { StrokeOptions } from './types'

/**
 * Baseline benchmark for freehand ink generation.
 *
 * This measures the pure-computation cost of turning raw input points into stroke
 * outlines / SVG path data — the work that runs on the CPU every time draw + highlight
 * shapes render (notably: re-rendering every visible stroke when a zoom crosses the
 * `forceSolid` threshold, on load, and on SVG export). It is the slice of the codebase a
 * Rust/WASM port would replace, so the numbers here are the baseline to beat.
 *
 * It is intentionally DOM-free and React-free: it isolates ink generation only.
 *
 * Run:
 *   cd packages/tldraw && yarn test run --grep "ink generation baseline"
 *
 * Tune the corpus size (default 2000 strokes ~ a heavy doc):
 *   INK_BENCH_STROKES=5000 yarn test run --grep "ink generation baseline"
 */

// Deterministic PRNG so the corpus — and therefore the baseline — is stable across runs.
function mulberry32(seed: number) {
	let a = seed
	return () => {
		a |= 0
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

interface Stroke {
	points: VecLike[]
}

/**
 * Generate one realistic-looking stroke: a momentum random walk (so it curves like a
 * real pen path rather than jittering), with per-point pressure in the z channel.
 */
function makeStroke(rand: () => number): Stroke {
	// Length distribution: mostly short marks, a long tail of sweeping strokes.
	const len = Math.floor(15 + Math.pow(rand(), 3) * 300)
	const points: VecLike[] = new Array(len)
	let x = rand() * 1000
	let y = rand() * 1000
	let angle = rand() * Math.PI * 2
	const step = 1.5 + rand() * 3
	for (let i = 0; i < len; i++) {
		angle += (rand() - 0.5) * 0.6
		x += Math.cos(angle) * step
		y += Math.sin(angle) * step
		const pressure = 0.5 + (rand() - 0.5) * 0.4
		points[i] = { x, y, z: pressure }
	}
	return { points }
}

function makeCorpus(count: number): Stroke[] {
	const rand = mulberry32(0x5eed)
	const corpus = new Array<Stroke>(count)
	for (let i = 0; i < count; i++) corpus[i] = makeStroke(rand)
	return corpus
}

// Median wall-clock over several full passes of the corpus, after a warmup pass.
function measure(label: string, corpus: Stroke[], fn: (points: VecLike[]) => unknown) {
	const SAMPLES = 7
	// Warmup (let the JIT settle) + correctness sanity check.
	let lastOutputSize = 0
	for (const s of corpus) {
		const out = fn(s.points)
		lastOutputSize = typeof out === 'string' ? out.length : (out as unknown[]).length
	}
	expect(lastOutputSize, `${label} should produce output`).toBeGreaterThan(0)

	const times: number[] = []
	for (let sample = 0; sample < SAMPLES; sample++) {
		const start = performance.now()
		for (const s of corpus) fn(s.points)
		times.push(performance.now() - start)
	}
	times.sort((a, b) => a - b)
	const median = times[Math.floor(times.length / 2)]
	const min = times[0]
	const totalPoints = corpus.reduce((n, s) => n + s.points.length, 0)
	return {
		label,
		median,
		min,
		msPerStroke: median / corpus.length,
		strokesPerSec: Math.round(corpus.length / (median / 1000)),
		pointsPerMs: Math.round(totalPoints / median),
	}
}

describe('ink generation baseline', () => {
	const STROKE_COUNT = Number(process.env.INK_BENCH_STROKES) || 2000
	const corpus = makeCorpus(STROKE_COUNT)
	const totalPoints = corpus.reduce((n, s) => n + s.points.length, 0)

	// Production options, matched to what the draw/highlight shapes actually pass.
	const STROKE_WIDTH = 4
	const inkOpts: StrokeOptions = getFreehandOptions(
		{ dash: 'draw', isPen: false, isComplete: true },
		STROKE_WIDTH,
		false,
		false
	)
	const solidOpts: StrokeOptions = getFreehandOptions(
		{ dash: 'draw', isPen: false, isComplete: true },
		STROKE_WIDTH,
		false,
		true // forceSolid — the path used when zoomed out
	)
	const highlightOpts: StrokeOptions = getHighlightFreehandSettings({
		strokeWidth: STROKE_WIDTH * 2,
		showAsComplete: true,
	})

	it('measures the freehand generation hot paths', () => {
		const results = [
			// Draw shape, dash === 'draw': raw points -> svg path in a single pass. The hot path.
			measure('svgInk            (draw render)', corpus, (p) => svgInk(p, inkOpts)),
			// Draw shape when forceSolid (zoomed out): stroke points -> svg path, two passes.
			measure('getStrokePoints+svg (solid render)', corpus, (p) =>
				getSvgPathFromStrokePoints(getStrokePoints(p, solidOpts))
			),
			// getGeometry() for hit testing decodes points then calls getStrokePoints.
			measure('getStrokePoints   (hit geometry)', corpus, (p) => getStrokePoints(p, inkOpts)),
			// Highlight shape render + geometry: full outline polygon.
			measure('getStroke         (highlight)', corpus, (p) => getStroke(p, highlightOpts)),
		]

		// eslint-disable-next-line no-console
		console.log(
			[
				'',
				`Freehand ink generation baseline`,
				`  corpus: ${corpus.length} strokes, ${totalPoints} points (avg ${(
					totalPoints / corpus.length
				).toFixed(1)}/stroke)`,
				`  node:   ${process.version}`,
				'',
				'  ' +
					[
						'path'.padEnd(36),
						'median ms'.padStart(10),
						'min ms'.padStart(9),
						'ms/stroke'.padStart(11),
						'strokes/s'.padStart(11),
						'points/ms'.padStart(11),
					].join(''),
				'  ' + '-'.repeat(36 + 10 + 9 + 11 + 11 + 11),
				...results.map(
					(r) =>
						'  ' +
						[
							r.label.padEnd(36),
							r.median.toFixed(2).padStart(10),
							r.min.toFixed(2).padStart(9),
							r.msPerStroke.toFixed(4).padStart(11),
							String(r.strokesPerSec).padStart(11),
							String(r.pointsPerMs).padStart(11),
						].join('')
				),
				'',
			].join('\n')
		)

		// Not an assertion on speed — just guard that every path produced output.
		for (const r of results) expect(r.median).toBeGreaterThan(0)
	})
})
