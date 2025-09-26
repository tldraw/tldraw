import { describe, expect, it } from 'vitest'
import { DefaultVerticalAlignStyle, TLDefaultVerticalAlignStyle } from './TLVerticalAlignStyle'

describe('TLVerticalAlignStyle', () => {
	it('should have correct configuration', () => {
		expect(DefaultVerticalAlignStyle.id).toBe('tldraw:verticalAlign')
		expect(DefaultVerticalAlignStyle.defaultValue).toBe('middle')
		expect(DefaultVerticalAlignStyle.values).toEqual(['start', 'middle', 'end'])
	})

	it('should validate all allowed values', () => {
		const validValues: TLDefaultVerticalAlignStyle[] = ['start', 'middle', 'end']
		validValues.forEach((value) => {
			expect(DefaultVerticalAlignStyle.validate(value)).toBe(value)
		})
	})

	it('should reject invalid values', () => {
		expect(() => DefaultVerticalAlignStyle.validate('top')).toThrow()
		expect(() => DefaultVerticalAlignStyle.validate('invalid')).toThrow()
		expect(() => DefaultVerticalAlignStyle.validate(null)).toThrow()
	})
})
