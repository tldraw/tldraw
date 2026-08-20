import { areAnglesCompatible, getPointInArcT } from './utils'

describe('getPointInArcT', () => {
	it('should return 0 for the start of the arc', () => {
		const mAB = Math.PI / 2 // 90 degrees
		const A = 0 // Start angle
		const B = Math.PI / 2 // End angle
		const P = 0 // Point angle, same as start
		expect(getPointInArcT(mAB, A, B, P)).toBe(0)
	})

	it('should return 1 for the end of the arc', () => {
		const mAB = Math.PI / 2 // 90 degrees
		const A = 0 // Start angle
		const B = Math.PI / 2 // End angle
		const P = Math.PI / 2 // Point angle, same as end
		expect(getPointInArcT(mAB, A, B, P)).toBe(1)
	})

	it('should return 0.5 for the midpoint of the arc', () => {
		const mAB = Math.PI // 180 degrees
		const A = 0 // Start angle
		const B = Math.PI // End angle
		const P = Math.PI / 2 // Point angle, midpoint
		expect(getPointInArcT(mAB, A, B, P)).toBe(0.5)
	})

	it('should handle negative arcs correctly', () => {
		const mAB = -Math.PI / 2 // -90 degrees, counter-clockwise
		const A = Math.PI / 2 // Start angle
		const B = 0 // End angle
		const P = Math.PI / 4 // Point angle, quarter way
		expect(getPointInArcT(mAB, A, B, P)).toBe(0.5)
	})

	it('should return correct t value for arcs larger than PI', () => {
		const mAB = Math.PI * 1.5 // 270 degrees
		const A = 0 // Start angle
		const B = -Math.PI / 2 // End angle, going counter-clockwise
		const P = -Math.PI / 4 // Point angle, halfway
		expect(getPointInArcT(mAB, A, B, P)).toBe(7 / 6)
	})

	it('should handle edge case where measurement to center is negative but measure to points near the end are positive', () => {
		const mAB = -2.8 // Arc measure
		const A = 0 // Start angle
		const B = 2.2 // End angle
		const P = 1.1 // Point angle, should be near the end
		expect(getPointInArcT(mAB, A, B, P)).toBe(0)
	})

	it('should clamp a point in the gap to the angularly nearer endpoint', () => {
		// Replaces a zero-measure case that encoded the old fixed 0.5 threshold.
		// Quarter arc from 0 to PI/2: a point at -PI/2 is PI/2 behind the start but
		// PI past the end, so it belongs to the start...
		expect(getPointInArcT(Math.PI / 2, 0, Math.PI / 2, -Math.PI / 2)).toBe(0)
		// ...while a point at PI is PI behind the start but only PI/2 past the end
		expect(getPointInArcT(Math.PI / 2, 0, Math.PI / 2, Math.PI)).toBe(1)
	})
})

describe('areAnglesCompatible', () => {
	it('treats angles a multiple of PI/2 apart as compatible regardless of sign', () => {
		expect(areAnglesCompatible(-Math.PI / 4, Math.PI / 4)).toBe(true)
		expect(areAnglesCompatible(Math.PI / 2 - 1e-9, 0)).toBe(true)
		expect(areAnglesCompatible(Math.PI, -Math.PI / 2)).toBe(true)
		expect(areAnglesCompatible(0, Math.PI / 3)).toBe(false)
	})
})
