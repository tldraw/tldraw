import { describe, expect, test } from 'vitest'
import { SetValue } from './util-types'

describe('util-types', () => {
	describe('SetValue utility type', () => {
		test('should work with const asserted arrays converted to sets', () => {
			const COLORS = new Set(['red', 'green', 'blue'] as const)
			type ColorSet = typeof COLORS
			type Color = SetValue<ColorSet>

			// TypeScript compile-time test
			const redColor: Color = 'red'

			// Runtime verification - this is the actual business value
			function isValidColor(color: string): color is Color {
				return COLORS.has(color as Color)
			}

			expect(isValidColor(redColor)).toBe(true)
			expect(isValidColor('invalid')).toBe(false)
		})

		test('should work in function parameters for type guards', () => {
			const STATUSES = new Set(['pending', 'completed', 'failed'] as const)
			type StatusSet = typeof STATUSES
			type Status = SetValue<StatusSet>

			function processStatus(input: unknown): Status | null {
				if (typeof input === 'string' && STATUSES.has(input as Status)) {
					return input as Status
				}
				return null
			}

			// Test the actual business logic this utility enables
			expect(processStatus('pending')).toBe('pending')
			expect(processStatus('invalid')).toBe(null)
		})

		test('should work with tldraw style enum patterns', () => {
			// Test the actual usage pattern in tldraw codebase
			const UI_COLORS = new Set(['selection-stroke', 'accent', 'muted'] as const)
			type UIColorSet = typeof UI_COLORS
			type UIColor = SetValue<UIColorSet>

			function isValidUIColor(color: string): color is UIColor {
				return UI_COLORS.has(color as UIColor)
			}

			expect(isValidUIColor('accent')).toBe(true)
			expect(isValidUIColor('invalid')).toBe(false)
		})
	})
})
