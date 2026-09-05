import { EASINGS, EasingType } from './easings'

const SAMPLES = Array.from({ length: 21 }, (_, i) => i / 20)

const IN_OUT_PAIRS: Array<[EasingType, EasingType]> = [
	['easeInQuad', 'easeOutQuad'],
	['easeInCubic', 'easeOutCubic'],
	['easeInQuart', 'easeOutQuart'],
	['easeInQuint', 'easeOutQuint'],
	['easeInSine', 'easeOutSine'],
	['easeInExpo', 'easeOutExpo'],
]

const IN_OUT_EASINGS: EasingType[] = [
	'easeInOutQuad',
	'easeInOutCubic',
	'easeInOutQuart',
	'easeInOutQuint',
	'easeInOutSine',
	'easeInOutExpo',
]

describe('EASINGS', () => {
	it.each(Object.keys(EASINGS) as EasingType[])('%s maps 0 to 0 and 1 to 1', (name) => {
		const ease = EASINGS[name]
		expect(ease(0)).toBeCloseTo(0, 10)
		expect(ease(1)).toBeCloseTo(1, 10)
	})

	it.each(Object.keys(EASINGS) as EasingType[])('%s is monotonically non-decreasing', (name) => {
		const ease = EASINGS[name]
		for (let i = 1; i < SAMPLES.length; i++) {
			expect(ease(SAMPLES[i])).toBeGreaterThanOrEqual(ease(SAMPLES[i - 1]) - 1e-12)
		}
	})

	it.each(IN_OUT_PAIRS)('%s and %s are mirror images', (easeIn, easeOut) => {
		for (const t of SAMPLES) {
			expect(EASINGS[easeOut](t)).toBeCloseTo(1 - EASINGS[easeIn](1 - t), 10)
		}
	})

	it.each(IN_OUT_EASINGS)('%s is symmetric about the midpoint', (name) => {
		const ease = EASINGS[name]
		expect(ease(0.5)).toBeCloseTo(0.5, 10)
		for (const t of SAMPLES) {
			expect(ease(t) + ease(1 - t)).toBeCloseTo(1, 10)
		}
	})

	it('ease-in curves start slower than linear and ease-out curves start faster', () => {
		for (const [easeIn, easeOut] of IN_OUT_PAIRS) {
			expect(EASINGS[easeIn](0.5)).toBeLessThan(0.5)
			expect(EASINGS[easeOut](0.5)).toBeGreaterThan(0.5)
		}
	})

	it('returns the expected midpoint values', () => {
		expect(EASINGS.linear(0.5)).toBe(0.5)
		expect(EASINGS.easeInQuad(0.5)).toBe(0.25)
		expect(EASINGS.easeOutQuad(0.5)).toBe(0.75)
		expect(EASINGS.easeInOutQuad(0.25)).toBe(0.125)
		expect(EASINGS.easeInCubic(0.5)).toBe(0.125)
		expect(EASINGS.easeOutCubic(0.5)).toBe(0.875)
		expect(EASINGS.easeInOutCubic(0.25)).toBe(0.0625)
		expect(EASINGS.easeInQuart(0.5)).toBe(0.0625)
		expect(EASINGS.easeOutQuart(0.5)).toBe(0.9375)
		expect(EASINGS.easeInOutQuart(0.25)).toBe(0.03125)
		expect(EASINGS.easeInQuint(0.5)).toBe(0.03125)
		expect(EASINGS.easeOutQuint(0.5)).toBe(0.96875)
		expect(EASINGS.easeInOutQuint(0.25)).toBe(0.015625)
		expect(EASINGS.easeInSine(0.5)).toBeCloseTo(1 - Math.SQRT1_2, 10)
		expect(EASINGS.easeOutSine(0.5)).toBeCloseTo(Math.SQRT1_2, 10)
		expect(EASINGS.easeInOutSine(0.25)).toBeCloseTo((1 - Math.SQRT1_2) / 2, 10)
		expect(EASINGS.easeInExpo(0.5)).toBe(0.03125)
		expect(EASINGS.easeOutExpo(0.5)).toBe(0.96875)
		expect(EASINGS.easeInOutExpo(0.25)).toBe(0.015625)
		expect(EASINGS.easeInOutExpo(0.75)).toBe(0.984375)
	})

	it('clamps the exponential easings at their endpoints instead of leaving a residual', () => {
		expect(EASINGS.easeInExpo(0)).toBe(0)
		expect(EASINGS.easeInExpo(-1)).toBe(0)
		expect(EASINGS.easeOutExpo(1)).toBe(1)
		expect(EASINGS.easeOutExpo(2)).toBe(1)
		expect(EASINGS.easeInOutExpo(0)).toBe(0)
		expect(EASINGS.easeInOutExpo(1)).toBe(1)
		expect(EASINGS.easeInOutExpo(-0.5)).toBe(0)
		expect(EASINGS.easeInOutExpo(1.5)).toBe(1)
	})
})
