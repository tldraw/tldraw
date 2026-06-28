import { describe, expect, it } from 'vitest'
import { average, precise } from '../../primitives/utils'
import { VecLike } from '../../primitives/Vec'
import { getSvgPathFromPointsWasm } from './svgInkWasm'

// Verifies the Rust/WASM port of getSvgPathFromPoints byte-for-byte against a JS oracle (the
// original implementation, inlined here so the SDK itself carries no second implementation).

function jsOracle(points: VecLike[], closed = true): string {
	const len = points.length
	if (len < 2) return ''
	let a = points[0]
	let b = points[1]
	if (len === 2) return `M${precise(a)}L${precise(b)}`
	let result = ''
	for (let i = 2, max = len - 1; i < max; i++) {
		a = points[i]
		b = points[i + 1]
		result += average(a, b)
	}
	if (closed) {
		return `M${average(points[0], points[1])}Q${precise(points[1])}${average(
			points[1],
			points[2]
		)}T${result}${average(points[len - 1], points[0])}${average(points[0], points[1])}Z`
	} else {
		return `M${precise(points[0])}Q${precise(points[1])}${average(points[1], points[2])}${
			points.length > 3 ? 'T' : ''
		}${result}L${precise(points[len - 1])}`
	}
}

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

describe('getSvgPathFromPoints wasm', () => {
	const rand = mulberry32(0x1234)
	const corpus: VecLike[][] = Array.from({ length: 1500 }, () => {
		const len = Math.floor(2 + rand() * 60)
		return Array.from({ length: len }, () => ({ x: rand() * 2000 - 1000, y: rand() * 2000 - 1000 }))
	})

	for (const closed of [true, false]) {
		it(`matches the JS implementation byte-for-byte — closed=${closed}`, () => {
			let mismatches = 0
			for (const points of corpus) {
				const js = jsOracle(points, closed)
				const wasm = getSvgPathFromPointsWasm(points, closed)
				if (js !== wasm) {
					mismatches++
					if (mismatches <= 3) {
						// eslint-disable-next-line no-console
						console.log(`closed=${closed} (${points.length} pts)\n  js  : ${js}\n  wasm: ${wasm}`)
					}
				}
			}
			expect(mismatches).toBe(0)
		})
	}

	it('handles the degenerate cases like JS', () => {
		expect(getSvgPathFromPointsWasm([], true)).toBe('')
		expect(getSvgPathFromPointsWasm([{ x: 1, y: 2 }], true)).toBe('')
		const two = [
			{ x: 1.5, y: 2.25 },
			{ x: 3, y: 4 },
		]
		expect(getSvgPathFromPointsWasm(two, true)).toBe(jsOracle(two, true))
	})
})
