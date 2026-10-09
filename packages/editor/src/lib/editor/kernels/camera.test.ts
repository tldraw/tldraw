import type { TLCameraConstraints } from '../types/misc-types'
import { constrainCamera, ConstrainCameraInput, getFitZoom } from './camera'

// Zoom clamping, zoom steps, zooming about a point and most constraint behaviors are covered through
// the editor in packages/tldraw/src/test/commands/{setCamera,zoomIn,zoomOut}.test.ts. These are the
// fit modes and behaviors those don't reach.

const viewport = { w: 1000, h: 500 }
const zoomSteps = [0.1, 0.5, 1, 2, 4]

function constraints(overrides: Partial<TLCameraConstraints> = {}): TLCameraConstraints {
	return {
		bounds: { x: 0, y: 0, w: 2000, h: 500 },
		padding: { x: 0, y: 0 },
		origin: { x: 0.5, y: 0.5 },
		initialZoom: 'fit-max',
		baseZoom: 'default',
		behavior: 'free',
		...overrides,
	}
}

function input(overrides: Partial<ConstrainCameraInput> = {}): ConstrainCameraInput {
	return {
		current: { x: 0, y: 0, z: 1 },
		requested: { x: 0, y: 0, z: 1 },
		zoomSteps,
		constraints: constraints(),
		viewport,
		baseZoom: 1,
		resetZoom: null,
		...overrides,
	}
}

describe('getFitZoom', () => {
	const c = constraints({ padding: { x: 100, y: 50 } })

	it.each([
		['fit-x', 0.4],
		['fit-y', 0.8],
		['fit-x-100', 0.4],
	] as const)('%s', (fit, expected) => {
		// (1000 - 200) / 2000 = 0.4 on x; (500 - 100) / 500 = 0.8 on y
		expect(getFitZoom(fit, c, viewport)).toBeCloseTo(expected)
	})

	it('caps the -100 modes at 100%', () => {
		const small = constraints({ bounds: { x: 0, y: 0, w: 100, h: 100 } })
		expect(getFitZoom('fit-max-100', small, viewport)).toBe(1)
		expect(getFitZoom('fit-y-100', small, viewport)).toBe(1)
	})

	it('clamps padding to half the viewport', () => {
		const huge = constraints({ padding: { x: 10_000, y: 10_000 } })
		expect(getFitZoom('fit-x', huge, viewport)).toBe(0)
	})
})

describe('constrainCamera', () => {
	it('centers a fixed axis on the origin', () => {
		// free width at z=1 is 1000 - 2000 = -1000, so origin x is 0 + -1000 * 0.5
		const out = constrainCamera(
			input({ constraints: constraints({ behavior: 'fixed' }), requested: { x: 50, y: 50, z: 1 } })
		)
		expect(out).toEqual({ x: -500, y: 0, z: 1 })
	})

	it('is idempotent', () => {
		const c = constraints({ behavior: 'inside', padding: { x: 40, y: 20 } })
		const once = constrainCamera(input({ constraints: c, requested: { x: 900, y: -300, z: 0.3 } }))
		const twice = constrainCamera(
			input({ constraints: c, requested: once, current: { x: once.x, y: once.y, z: once.z } })
		)
		expect(twice).toEqual(once)
	})
})
