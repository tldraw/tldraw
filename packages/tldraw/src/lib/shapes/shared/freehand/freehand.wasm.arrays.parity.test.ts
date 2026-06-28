import {
	VecLike,
	strokeOutlineFromPointsWasm,
	strokeOutlineWasm,
	strokePointsWasm,
	svgPathFromStrokePointsWasm,
} from '@tldraw/editor'
import { EASINGS } from '@tldraw/editor'
import { describe, expect, it } from 'vitest'
import { getStroke } from './oracle/getStroke'
import { getStrokeOutlinePoints } from './oracle/getStrokeOutlinePoints'
import { getStrokePoints } from './oracle/getStrokePoints'
import { getSvgPathFromStrokePoints } from './oracle/svg'
import { StrokeOptions } from './types'

// Verifies the array-returning WASM ports (getStrokePoints, getStroke,
// getStrokeOutlinePoints, getSvgPathFromStrokePoints) against the JS implementations.

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

function makeCorpus(count: number): VecLike[][] {
	const rand = mulberry32(0x5eed)
	return Array.from({ length: count }, () => {
		const len = Math.floor(15 + Math.pow(rand(), 3) * 300)
		let x = rand() * 1000
		let y = rand() * 1000
		let angle = rand() * Math.PI * 2
		const step = 1.5 + rand() * 3
		return Array.from({ length: len }, () => {
			angle += (rand() - 0.5) * 0.6
			x += Math.cos(angle) * step
			y += Math.sin(angle) * step
			return { x, y, z: 0.5 + (rand() - 0.5) * 0.4 }
		})
	})
}

const corpus = makeCorpus(1500)
const EPS = 1e-6

const highlightOpts: StrokeOptions = {
	size: 9,
	thinning: 0,
	streamline: 0.5,
	smoothing: 0.5,
	simulatePressure: false,
	easing: EASINGS.easeOutSine,
	last: true,
}
// Scribble-like: tapered start, real (non-simulated) pressure.
const taperOpts: StrokeOptions = {
	size: 8,
	start: { taper: 12, easing: EASINGS.linear },
	last: true,
	simulatePressure: false,
	streamline: 0.5,
}

function maxArrayDiff(a: Float64Array, jsPts: VecLike[]): { count: number; maxDiff: number } {
	if (a.length !== jsPts.length * 2)
		return { count: Math.abs(a.length - jsPts.length * 2), maxDiff: Infinity }
	let maxDiff = 0
	for (let i = 0; i < jsPts.length; i++) {
		maxDiff = Math.max(
			maxDiff,
			Math.abs(a[i * 2] - jsPts[i].x),
			Math.abs(a[i * 2 + 1] - jsPts[i].y)
		)
	}
	return { count: maxDiff > EPS ? 1 : 0, maxDiff }
}

describe('freehand array wasm parity', () => {
	it('getStrokePoints matches JS', () => {
		let mismatches = 0
		let maxDiff = 0
		for (const points of corpus) {
			const js = getStrokePoints(points, highlightOpts)
			const data = strokePointsWasm(points, highlightOpts)!
			if (data.length !== js.length * 8) {
				mismatches++
				continue
			}
			for (let i = 0; i < js.length; i++) {
				const b = i * 8
				const sp = js[i]
				maxDiff = Math.max(
					maxDiff,
					Math.abs(data[b] - sp.point.x),
					Math.abs(data[b + 1] - sp.point.y),
					Math.abs(data[b + 2] - sp.input.x),
					Math.abs(data[b + 3] - sp.input.y),
					Math.abs(data[b + 5] - sp.pressure),
					Math.abs(data[b + 6] - sp.distance),
					Math.abs(data[b + 7] - sp.runningLength)
				)
			}
		}
		expect(mismatches).toBe(0)
		expect(maxDiff).toBeLessThan(EPS)
	})

	for (const [name, opts] of [
		['highlight', highlightOpts],
		['taper', taperOpts],
	] as const) {
		it(`getStroke matches JS — ${name}`, () => {
			let mismatches = 0
			let worst = 0
			for (const points of corpus) {
				const js = getStroke(points, opts)
				const data = strokeOutlineWasm(points, opts)!
				const { count, maxDiff } = maxArrayDiff(data, js)
				mismatches += count
				worst = Math.max(worst, maxDiff === Infinity ? 0 : maxDiff)
			}
			expect(mismatches).toBe(0)
			expect(worst).toBeLessThan(EPS)
		})
	}

	it('getStrokeOutlinePoints matches JS', () => {
		let mismatches = 0
		for (const points of corpus) {
			const strokePoints = getStrokePoints(points, highlightOpts)
			const js = getStrokeOutlinePoints(strokePoints, highlightOpts)
			const data = strokeOutlineFromPointsWasm(strokePoints, highlightOpts)!
			mismatches += maxArrayDiff(data, js).count
		}
		expect(mismatches).toBe(0)
	})

	it('getSvgPathFromStrokePoints matches JS byte-for-byte', () => {
		let mismatches = 0
		for (const closed of [false, true]) {
			for (const points of corpus) {
				const strokePoints = getStrokePoints(points, highlightOpts)
				const js = getSvgPathFromStrokePoints(strokePoints, closed)
				const wasm = svgPathFromStrokePointsWasm(
					strokePoints.map((p) => p.point),
					closed
				)
				if (js !== wasm) mismatches++
			}
		}
		expect(mismatches).toBe(0)
	})
})
