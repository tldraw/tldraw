import { VecLike, svgFromPointsWasm, svgInkWasm } from '@tldraw/editor'
import { describe, expect, it } from 'vitest'
import { getFreehandOptions } from '../../draw/getPath'
import { getStrokePoints } from './oracle/getStrokePoints'
import { getSvgPathFromStrokePoints } from './oracle/svg'
import { svgInk } from './oracle/svgInk'
import { StrokeOptions } from './types'

/**
 * Parity + benchmark for the Rust/WASM port of `svgInk` against the JS implementation.
 *
 * Parity: the WASM port aims to be byte-for-byte identical to JS `svgInk`. Because both
 * round to integer hundredths of a pixel before stringifying (see fmt.ts), exact string
 * equality is the right check — any sub-0.01px float divergence is rounded away. A tiny
 * mismatch budget is tolerated for the rare coordinate that lands exactly on a rounding
 * boundary where a last-ULP difference between V8 and Rust could tip it.
 *
 * Benchmark: same corpus and options as freehand.baseline.test.ts so the numbers compare
 * directly.
 *
 * Run:
 *   yarn workspace tldraw test run \
 *     src/lib/shapes/shared/freehand/wasm/svgInkWasm.parity.test.ts \
 *     -t "svgInk wasm" --disable-console-intercept
 */

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

function makeStroke(rand: () => number): VecLike[] {
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
		points[i] = { x, y, z: 0.5 + (rand() - 0.5) * 0.4 }
	}
	return points
}

function makeCorpus(count: number): VecLike[][] {
	const rand = mulberry32(0x5eed)
	return Array.from({ length: count }, () => makeStroke(rand))
}

describe('svgInk wasm', () => {
	const STROKE_COUNT = Number(process.env.INK_BENCH_STROKES) || 2000
	const corpus = makeCorpus(STROKE_COUNT)
	const totalPoints = corpus.reduce((n, s) => n + s.length, 0)

	const STROKE_WIDTH = 4
	// Mouse draw (simulatePressure, easeOutSine) — the common production case.
	const inkOpts: StrokeOptions = getFreehandOptions(
		{ dash: 'draw', isPen: false, isComplete: true },
		STROKE_WIDTH,
		false,
		false
	)
	// Pen draw (real pressure, PEN_EASING) — exercises the other easing + simulatePressure=false.
	const penOpts: StrokeOptions = getFreehandOptions(
		{ dash: 'draw', isPen: true, isComplete: true },
		STROKE_WIDTH,
		false,
		false
	)

	it('produces output for the supported options', () => {
		expect(svgInkWasm(corpus[0], inkOpts)).toBeTypeOf('string')
		expect(svgInkWasm(corpus[0], penOpts)).toBeTypeOf('string')
	})

	for (const [name, opts] of [
		['mouse (easeOutSine)', inkOpts],
		['pen (penEasing)', penOpts],
	] as const) {
		it(`matches JS svgInk byte-for-byte — ${name}`, () => {
			let mismatches = 0
			const examples: string[] = []
			for (let i = 0; i < corpus.length; i++) {
				const js = svgInk(corpus[i], opts)
				const wasm = svgInkWasm(corpus[i], opts)
				if (js !== wasm) {
					mismatches++
					if (examples.length < 3) {
						examples.push(
							`stroke ${i} (${corpus[i].length} pts):\n  js  : ${js.slice(0, 160)}\n  wasm: ${(wasm ?? '<null>').slice(0, 160)}`
						)
					}
				}
			}
			const rate = mismatches / corpus.length
			if (mismatches > 0) {
				// eslint-disable-next-line no-console
				console.log(
					`\n[${name}] ${mismatches}/${corpus.length} mismatches (${(rate * 100).toFixed(3)}%)\n${examples.join('\n')}\n`
				)
			}
			// Allow a tiny rounding-boundary budget; expect near-perfect parity.
			expect(rate).toBeLessThan(0.01)
		})
	}

	// Centerline path (solid/fill render) parity. forceSolid uses linear easing; also cover
	// the closed (fill) variant.
	const solidOpts: StrokeOptions = getFreehandOptions(
		{ dash: 'draw', isPen: false, isComplete: true },
		STROKE_WIDTH,
		false,
		true
	)
	for (const closed of [false, true]) {
		it(`svgFromPoints matches JS byte-for-byte — closed=${closed}`, () => {
			let mismatches = 0
			const examples: string[] = []
			for (let i = 0; i < corpus.length; i++) {
				const js = getSvgPathFromStrokePoints(getStrokePoints(corpus[i], solidOpts), closed)
				const wasm = svgFromPointsWasm(corpus[i], solidOpts, closed)
				if (js !== wasm?.path) {
					mismatches++
					if (examples.length < 3) {
						examples.push(
							`stroke ${i} (${corpus[i].length} pts):\n  js  : ${js.slice(0, 160)}\n  wasm: ${(wasm?.path ?? '<null>').slice(0, 160)}`
						)
					}
				}
			}
			const rate = mismatches / corpus.length
			if (mismatches > 0) {
				// eslint-disable-next-line no-console
				console.log(
					`\n[svgFromPoints closed=${closed}] ${mismatches}/${corpus.length} mismatches (${(rate * 100).toFixed(3)}%)\n${examples.join('\n')}\n`
				)
			}
			expect(rate).toBeLessThan(0.01)
		})
	}

	it('svgFromPoints reports the same point count as getStrokePoints', () => {
		for (let i = 0; i < Math.min(corpus.length, 200); i++) {
			const jsCount = getStrokePoints(corpus[i], solidOpts).length
			const wasm = svgFromPointsWasm(corpus[i], solidOpts, false)
			expect(wasm?.pointCount).toBe(jsCount)
		}
	})

	it('benchmarks wasm vs js', () => {
		const SAMPLES = 7
		const time = (label: string, fn: (p: VecLike[]) => unknown) => {
			for (const s of corpus) fn(s) // warmup
			const times: number[] = []
			for (let k = 0; k < SAMPLES; k++) {
				const start = performance.now()
				for (const s of corpus) fn(s)
				times.push(performance.now() - start)
			}
			times.sort((a, b) => a - b)
			const median = times[Math.floor(times.length / 2)]
			return { label, median, pointsPerMs: Math.round(totalPoints / median) }
		}

		const js = time('svgInk (JS)', (p) => svgInk(p, inkOpts))
		const wasm = time('svgInk (WASM)', (p) => svgInkWasm(p, inkOpts))

		// eslint-disable-next-line no-console
		console.log(
			[
				'',
				`svgInk JS vs WASM — ${corpus.length} strokes, ${totalPoints} points`,
				`  ${js.label.padEnd(16)} ${js.median.toFixed(2).padStart(8)} ms   ${String(js.pointsPerMs).padStart(7)} points/ms`,
				`  ${wasm.label.padEnd(16)} ${wasm.median.toFixed(2).padStart(8)} ms   ${String(wasm.pointsPerMs).padStart(7)} points/ms`,
				`  speedup: ${(js.median / wasm.median).toFixed(2)}x`,
				'',
			].join('\n')
		)

		expect(wasm.median).toBeGreaterThan(0)
	})
})
