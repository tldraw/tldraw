import { describe, expect, it } from 'vitest'
import {
	DefaultHorizontalAlignStyle,
	TLDefaultHorizontalAlignStyle,
} from './TLHorizontalAlignStyle'

describe('TLHorizontalAlignStyle', () => {
	describe('DefaultHorizontalAlignStyle', () => {
		it('should be a StyleProp with correct configuration', () => {
			expect(DefaultHorizontalAlignStyle.id).toBe('tldraw:horizontalAlign')
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('middle')
		})

		it('should have the correct values array', () => {
			expect(DefaultHorizontalAlignStyle.values).toEqual([
				'start',
				'middle',
				'end',
				'start-legacy',
				'end-legacy',
				'middle-legacy',
			])
		})

		it('should contain exactly 6 alignment options', () => {
			expect(DefaultHorizontalAlignStyle.values).toHaveLength(6)
		})

		it('should not contain duplicates in values', () => {
			const uniqueValues = new Set(DefaultHorizontalAlignStyle.values)
			expect(uniqueValues.size).toBe(DefaultHorizontalAlignStyle.values.length)
		})
	})

	describe('validation', () => {
		it('should validate all allowed horizontal alignment values', () => {
			const validValues: TLDefaultHorizontalAlignStyle[] = [
				'start',
				'middle',
				'end',
				'start-legacy',
				'end-legacy',
				'middle-legacy',
			]

			validValues.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).not.toThrow()
				expect(DefaultHorizontalAlignStyle.validate(value)).toBe(value)
			})
		})

		it('should reject invalid horizontal alignment values', () => {
			const invalidValues = [
				'left',
				'right',
				'center',
				'justify',
				'invalid',
				'',
				'LEFT',
				'RIGHT',
				'CENTER',
				'Start',
				'Middle',
				'End',
				'startlegacy',
				'endlegacy',
				'middlelegacy',
			]

			invalidValues.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should reject non-string values', () => {
			const invalidTypes = [null, undefined, 123, true, false, {}, [], Symbol('test')]

			invalidTypes.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			const result = DefaultHorizontalAlignStyle.validateUsingKnownGoodVersion('start', 'end')
			expect(result).toBe('end')

			expect(() =>
				DefaultHorizontalAlignStyle.validateUsingKnownGoodVersion('start', 'invalid')
			).toThrow()
		})
	})

	describe('default value management', () => {
		it('should allow setting default value to any valid alignment', () => {
			const originalDefault = DefaultHorizontalAlignStyle.defaultValue

			DefaultHorizontalAlignStyle.setDefaultValue('start')
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('start')

			DefaultHorizontalAlignStyle.setDefaultValue('end')
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('end')

			DefaultHorizontalAlignStyle.setDefaultValue('start-legacy')
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('start-legacy')

			// Restore original
			DefaultHorizontalAlignStyle.setDefaultValue(originalDefault)
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('middle')
		})

		it('should maintain the default value of middle initially', () => {
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('middle')
		})
	})

	describe('alignment values semantics', () => {
		it('should contain modern alignment values', () => {
			const modernValues = ['start', 'middle', 'end']
			modernValues.forEach((value) => {
				expect(DefaultHorizontalAlignStyle.values).toContain(value)
			})
		})

		it('should contain legacy alignment values', () => {
			const legacyValues = ['start-legacy', 'middle-legacy', 'end-legacy']
			legacyValues.forEach((value) => {
				expect(DefaultHorizontalAlignStyle.values).toContain(value)
			})
		})

		it('should differentiate between modern and legacy values', () => {
			const modernValues = ['start', 'middle', 'end']
			const legacyValues = ['start-legacy', 'middle-legacy', 'end-legacy']

			// Each modern value should have a corresponding legacy value
			modernValues.forEach((modern) => {
				const correspondingLegacy = `${modern}-legacy`
				expect(legacyValues).toContain(correspondingLegacy)
				expect(DefaultHorizontalAlignStyle.values).toContain(correspondingLegacy)
			})
		})

		it('should validate that all values are strings', () => {
			DefaultHorizontalAlignStyle.values.forEach((value) => {
				expect(typeof value).toBe('string')
				expect(value.length).toBeGreaterThan(0)
			})
		})

		it('should validate value naming conventions', () => {
			// Modern values should be simple words
			const modernValues = ['start', 'middle', 'end']
			modernValues.forEach((value) => {
				expect(DefaultHorizontalAlignStyle.values).toContain(value)
				expect(value).toMatch(/^[a-z]+$/) // Only lowercase letters
			})

			// Legacy values should end with '-legacy'
			const legacyValues = DefaultHorizontalAlignStyle.values.filter((value) =>
				value.endsWith('-legacy')
			)
			expect(legacyValues).toHaveLength(3)
			legacyValues.forEach((value) => {
				expect(value).toMatch(/^[a-z]+-legacy$/)
			})
		})
	})
})
