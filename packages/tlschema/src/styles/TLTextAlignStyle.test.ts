import { describe, expect, it } from 'vitest'
import { DefaultTextAlignStyle } from './TLTextAlignStyle'

describe('TLTextAlignStyle', () => {
	describe('DefaultTextAlignStyle', () => {
		it('should validate all valid text alignment values', () => {
			const validAlignments = ['start', 'middle', 'end']

			validAlignments.forEach((alignment) => {
				expect(() => DefaultTextAlignStyle.validate(alignment)).not.toThrow()
				expect(DefaultTextAlignStyle.validate(alignment)).toBe(alignment)
			})
		})

		it('should reject invalid text alignment values', () => {
			const invalidAlignments = [
				'left',
				'center',
				'right',
				'justify',
				'invalid',
				'',
				'Start',
				'MIDDLE',
				'End',
			]

			invalidAlignments.forEach((alignment) => {
				expect(() => DefaultTextAlignStyle.validate(alignment)).toThrow()
			})
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			const result = DefaultTextAlignStyle.validateUsingKnownGoodVersion('start', 'middle')
			expect(result).toBe('middle')

			expect(() =>
				DefaultTextAlignStyle.validateUsingKnownGoodVersion('start', 'invalid')
			).toThrow()
		})
	})
})
