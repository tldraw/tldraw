import { normalizeWheel } from './normalizeWheel'

function wheelEvent(props: Partial<WheelEvent>): WheelEvent {
	return {
		deltaX: 0,
		deltaY: 0,
		ctrlKey: false,
		altKey: false,
		metaKey: false,
		shiftKey: false,
		...props,
	} as WheelEvent
}

describe('normalizeWheel', () => {
	it('negates finite deltas for panning', () => {
		const { x, y } = normalizeWheel(wheelEvent({ deltaX: 5, deltaY: 10 }))
		expect(x).toBe(-5)
		expect(y).toBe(-10)
	})

	it('coerces a non-finite deltaX to zero movement', () => {
		const { x, y } = normalizeWheel(wheelEvent({ deltaX: NaN, deltaY: 10 }))
		expect(x === 0).toBe(true)
		expect(y).toBe(-10)
	})

	it('coerces a non-finite deltaY to zero movement', () => {
		const { x, y } = normalizeWheel(wheelEvent({ deltaX: 5, deltaY: Infinity }))
		expect(x).toBe(-5)
		expect(y === 0).toBe(true)
	})

	it('does not produce a non-finite zoom delta when wheeling with a bad deltaY', () => {
		const { z } = normalizeWheel(wheelEvent({ deltaY: NaN, ctrlKey: true }))
		expect(Number.isFinite(z)).toBe(true)
		expect(z === 0).toBe(true)
	})
})
