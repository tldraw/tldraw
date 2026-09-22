import type { TLCameraConstraints } from '../types/misc-types'
import { clampCameraZoom, constrainCamera, ConstrainCameraInput, getFitZoom } from './camera'

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

describe('clampCameraZoom', () => {
	it('passes through a zoom within the steps', () => {
		expect(clampCameraZoom({ x: 0, y: 0, z: 1 }, { x: 5, y: 6, z: 2 }, zoomSteps)).toEqual({
			x: 5,
			y: 6,
			z: 2,
		})
	})

	it('clamps zoom and keeps the focal point fixed', () => {
		// Zooming from 1 toward 8 around screen point (100, 100): at z=8 the camera would be at
		// -87.5. Clamped to 4, the same screen point stays under the cursor at -75.
		const current = { x: 0, y: 0, z: 1 }
		const requested = { x: 100 / 8 - 100, y: 100 / 8 - 100, z: 8 }
		expect(clampCameraZoom(current, requested, zoomSteps)).toEqual({ x: -75, y: -75, z: 4 })
	})

	it('keeps the current position when the requested zoom equals the current zoom', () => {
		expect(clampCameraZoom({ x: 3, y: 4, z: 8 }, { x: 99, y: 99, z: 8 }, zoomSteps)).toEqual({
			x: 3,
			y: 4,
			z: 4,
		})
	})
})

describe('getFitZoom', () => {
	const c = constraints({ padding: { x: 100, y: 50 } })

	it.each([
		['fit-x', 0.4],
		['fit-y', 0.8],
		['fit-min', 0.8],
		['fit-max', 0.4],
		['fit-x-100', 0.4],
		['fit-min-100', 0.8],
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
	it('clamps zoom to the steps scaled by the base zoom', () => {
		expect(constrainCamera(input({ requested: { x: 0, y: 0, z: 10 }, baseZoom: 2 })).z).toBe(8)
		expect(constrainCamera(input({ requested: { x: 0, y: 0, z: 0.01 }, baseZoom: 2 })).z).toBe(0.2)
	})

	it('leaves a free axis alone', () => {
		expect(constrainCamera(input({ requested: { x: 1234, y: -99, z: 1 } }))).toEqual({
			x: 1234,
			y: -99,
			z: 1,
		})
	})

	it('centers a fixed axis on the origin', () => {
		// free width at z=1 is 1000 - 2000 = -1000, so origin x is 0 + -1000 * 0.5
		const out = constrainCamera(
			input({ constraints: constraints({ behavior: 'fixed' }), requested: { x: 50, y: 50, z: 1 } })
		)
		expect(out).toEqual({ x: -500, y: 0, z: 1 })
	})

	it('contains: centers below fit zoom, clamps to the edges above it', () => {
		const c = constraints({ behavior: 'contain' })
		// y fit zoom is 1, x fit zoom is 0.5; at z=1 y is at fit, x is above fit
		expect(constrainCamera(input({ constraints: c, requested: { x: 100, y: 0, z: 1 } })).x).toBe(0)
		expect(constrainCamera(input({ constraints: c, requested: { x: -5000, y: 0, z: 1 } })).x).toBe(
			-1000
		)
		// below x fit zoom: center
		expect(constrainCamera(input({ constraints: c, requested: { x: 123, y: 0, z: 0.25 } })).x).toBe(
			(1000 / 0.25 - 2000) * 0.5
		)
	})

	it('outside: keeps the bounds from leaving the viewport', () => {
		const c = constraints({ behavior: 'outside' })
		expect(constrainCamera(input({ constraints: c, requested: { x: 5000, y: 0, z: 1 } })).x).toBe(
			1000
		)
		expect(constrainCamera(input({ constraints: c, requested: { x: -5000, y: 0, z: 1 } })).x).toBe(
			-2000
		)
	})

	it('applies per-axis behaviors', () => {
		const c = constraints({ behavior: { x: 'free', y: 'fixed' } })
		expect(constrainCamera(input({ constraints: c, requested: { x: 777, y: 777, z: 1 } }))).toEqual(
			{ x: 777, y: 0, z: 1 }
		)
	})

	it('resets to the origin at the reset zoom, ignoring behaviors', () => {
		const out = constrainCamera(
			input({ resetZoom: 0.5, requested: { x: 999, y: 999, z: 3 }, current: { x: 0, y: 0, z: 3 } })
		)
		// at z=0.5: free width 2000 - 2000 = 0, free height 1000 - 500 = 500
		expect(out).toEqual({ x: 0, y: 250, z: 0.5 })
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
