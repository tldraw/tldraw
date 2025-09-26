import { describe, expect, it } from 'vitest'
import {
	cursorTypeValidator,
	cursorValidator,
	TL_CURSOR_TYPES,
	TLCursor,
	TLCursorType,
} from './TLCursor'

describe('TLCursor', () => {
	describe('TL_CURSOR_TYPES', () => {
		it('should contain all expected cursor types', () => {
			const expectedCursors = [
				'none',
				'default',
				'pointer',
				'cross',
				'grab',
				'rotate',
				'grabbing',
				'resize-edge',
				'resize-corner',
				'text',
				'move',
				'ew-resize',
				'ns-resize',
				'nesw-resize',
				'nwse-resize',
				'nesw-rotate',
				'nwse-rotate',
				'swne-rotate',
				'senw-rotate',
				'zoom-in',
				'zoom-out',
			]

			expect(TL_CURSOR_TYPES.size).toBe(21)
			expectedCursors.forEach((cursor) => {
				expect(TL_CURSOR_TYPES.has(cursor as TLCursorType)).toBe(true)
			})
		})
	})

	describe('cursorTypeValidator', () => {
		it('should validate valid cursor types', () => {
			expect(cursorTypeValidator.validate('default')).toBe('default')
			expect(cursorTypeValidator.validate('pointer')).toBe('pointer')
			expect(cursorTypeValidator.validate('resize-corner')).toBe('resize-corner')
		})

		it('should reject invalid cursor types', () => {
			expect(() => cursorTypeValidator.validate('invalid')).toThrow()
			expect(() => cursorTypeValidator.validate('')).toThrow()
			expect(() => cursorTypeValidator.validate(null)).toThrow()
		})

		it('should handle isValid method correctly', () => {
			expect(cursorTypeValidator.isValid('default')).toBe(true)
			expect(cursorTypeValidator.isValid('invalid')).toBe(false)
			expect(cursorTypeValidator.isValid(null)).toBe(false)
		})
	})

	describe('cursorValidator', () => {
		it('should validate valid TLCursor objects', () => {
			const validCursor: TLCursor = { type: 'default', rotation: 0 }
			expect(cursorValidator.validate(validCursor)).toEqual(validCursor)

			const rotatedCursor: TLCursor = { type: 'resize-corner', rotation: Math.PI / 4 }
			expect(cursorValidator.validate(rotatedCursor)).toEqual(rotatedCursor)
		})

		it('should reject invalid cursor objects', () => {
			expect(() => cursorValidator.validate({ type: 'invalid', rotation: 0 })).toThrow()
			expect(() => cursorValidator.validate({ type: 'default', rotation: 'invalid' })).toThrow()
			expect(() => cursorValidator.validate({ type: 'default' })).toThrow() // missing rotation
			expect(() => cursorValidator.validate({ rotation: 0 })).toThrow() // missing type
			expect(() => cursorValidator.validate(null)).toThrow()
		})

		it('should handle isValid method correctly', () => {
			expect(cursorValidator.isValid({ type: 'default', rotation: 0 })).toBe(true)
			expect(cursorValidator.isValid({ type: 'invalid', rotation: 0 })).toBe(false)
			expect(cursorValidator.isValid({ type: 'default' })).toBe(false)
			expect(cursorValidator.isValid(null)).toBe(false)
		})
	})

	describe('integration tests', () => {
		it('should maintain consistency between Set and validators', () => {
			// Every value in the Set should be valid according to the validators
			for (const cursorType of TL_CURSOR_TYPES) {
				expect(cursorTypeValidator.isValid(cursorType)).toBe(true)
				expect(cursorTypeValidator.validate(cursorType)).toBe(cursorType)

				const cursor: TLCursor = { type: cursorType as TLCursorType, rotation: 0 }
				expect(cursorValidator.isValid(cursor)).toBe(true)
				expect(cursorValidator.validate(cursor)).toEqual(cursor)
			}
		})

		it('should work with rotation angles', () => {
			const cursor: TLCursor = { type: 'resize-corner', rotation: Math.PI / 4 }
			expect(cursorValidator.validate(cursor)).toEqual(cursor)
			expect(cursorValidator.isValid(cursor)).toBe(true)
		})
	})
})
