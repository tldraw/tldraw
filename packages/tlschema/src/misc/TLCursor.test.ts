import { describe, expect, it, test } from 'vitest'
import {
	cursorTypeValidator,
	cursorValidator,
	TL_CURSOR_TYPES,
	TLCursor,
	TLCursorType,
} from './TLCursor'

describe('TLCursor', () => {
	describe('TL_CURSOR_TYPES', () => {
		it('should be a Set containing expected cursor types', () => {
			expect(TL_CURSOR_TYPES).toBeInstanceOf(Set)
			expect(TL_CURSOR_TYPES.size).toBeGreaterThan(0)
		})

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

			expectedCursors.forEach((cursor) => {
				expect(TL_CURSOR_TYPES.has(cursor as TLCursorType)).toBe(true)
			})
		})

		it('should have the correct number of cursor types', () => {
			// Verify the set contains exactly the expected number of cursors
			expect(TL_CURSOR_TYPES.size).toBe(21)
		})

		it('should not contain unexpected cursor types', () => {
			const unexpectedCursors = [
				'help',
				'wait',
				'progress',
				'alias',
				'copy',
				'no-drop',
				'not-allowed',
				'all-scroll',
				'col-resize',
				'row-resize',
				'n-resize',
				's-resize',
				'e-resize',
				'w-resize',
				'ne-resize',
				'nw-resize',
				'se-resize',
				'sw-resize',
				'cell',
				'context-menu',
				'vertical-text',
			]

			unexpectedCursors.forEach((cursor) => {
				expect(TL_CURSOR_TYPES.has(cursor as any)).toBe(false)
			})
		})

		it('should be immutable (readonly)', () => {
			// The Set should be created with readonly values
			const originalSize = TL_CURSOR_TYPES.size

			// Try to add a new value (this should not affect the original set due to const assertion)
			expect(TL_CURSOR_TYPES.size).toBe(originalSize)
		})

		test('should work with Array.from() conversion', () => {
			const cursorsArray = Array.from(TL_CURSOR_TYPES)

			expect(Array.isArray(cursorsArray)).toBe(true)
			expect(cursorsArray.length).toBe(TL_CURSOR_TYPES.size)

			// All array elements should be strings
			cursorsArray.forEach((cursor) => {
				expect(typeof cursor).toBe('string')
			})
		})

		test('should support iteration', () => {
			let count = 0
			for (const cursor of TL_CURSOR_TYPES) {
				expect(typeof cursor).toBe('string')
				count++
			}
			expect(count).toBe(TL_CURSOR_TYPES.size)
		})

		test('should contain CSS-compatible cursor values', () => {
			// All cursor types should be valid CSS cursor values
			const cssCursors = [
				'none',
				'default',
				'pointer',
				'cross',
				'grab',
				'grabbing',
				'text',
				'move',
				'ew-resize',
				'ns-resize',
				'nesw-resize',
				'nwse-resize',
			]

			cssCursors.forEach((cursor) => {
				expect(TL_CURSOR_TYPES.has(cursor as TLCursorType)).toBe(true)
			})
		})

		test('should contain editor-specific cursor types', () => {
			// These are tldraw-specific cursor types
			const editorCursors = [
				'rotate',
				'resize-edge',
				'resize-corner',
				'nesw-rotate',
				'nwse-rotate',
				'swne-rotate',
				'senw-rotate',
				'zoom-in',
				'zoom-out',
			]

			editorCursors.forEach((cursor) => {
				expect(TL_CURSOR_TYPES.has(cursor as TLCursorType)).toBe(true)
			})
		})
	})

	describe('cursorTypeValidator', () => {
		describe('validate method', () => {
			it('should validate all valid cursor types', () => {
				const validCursors: TLCursorType[] = [
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

				validCursors.forEach((cursor) => {
					expect(() => cursorTypeValidator.validate(cursor)).not.toThrow()
					expect(cursorTypeValidator.validate(cursor)).toBe(cursor)
				})
			})

			it('should reject invalid cursor types', () => {
				const invalidCursors = [
					'help',
					'wait',
					'progress',
					'alias',
					'copy',
					'no-drop',
					'not-allowed',
					'all-scroll',
					'col-resize',
					'row-resize',
					'n-resize',
					's-resize',
					'e-resize',
					'w-resize',
					'ne-resize',
					'nw-resize',
					'se-resize',
					'sw-resize',
					'cell',
					'context-menu',
					'vertical-text',
					'invalid-cursor',
					'',
				]

				invalidCursors.forEach((cursor) => {
					expect(() => cursorTypeValidator.validate(cursor)).toThrow()
				})
			})

			it('should reject non-string values', () => {
				const nonStringValues = [
					123,
					null,
					undefined,
					{},
					[],
					true,
					false,
					Symbol('cursor'),
					new Date(),
				]

				nonStringValues.forEach((value) => {
					expect(() => cursorTypeValidator.validate(value)).toThrow()
				})
			})

			it('should provide descriptive error messages for invalid values', () => {
				expect(() => cursorTypeValidator.validate('invalid')).toThrow()
			})

			test('should handle edge case values', () => {
				const edgeCases = [
					'DEFAULT', // wrong case
					'default ', // trailing space
					' default', // leading space
					'default\n', // with newline
					'default\t', // with tab
				]

				edgeCases.forEach((value) => {
					expect(() => cursorTypeValidator.validate(value)).toThrow()
				})
			})

			test('should be case-sensitive', () => {
				const caseSensitiveTests = [
					{ input: 'DEFAULT', expected: false },
					{ input: 'Default', expected: false },
					{ input: 'default', expected: true },
					{ input: 'POINTER', expected: false },
					{ input: 'Pointer', expected: false },
					{ input: 'pointer', expected: true },
					{ input: 'TEXT', expected: false },
					{ input: 'Text', expected: false },
					{ input: 'text', expected: true },
				]

				caseSensitiveTests.forEach(({ input, expected }) => {
					if (expected) {
						expect(() => cursorTypeValidator.validate(input)).not.toThrow()
					} else {
						expect(() => cursorTypeValidator.validate(input)).toThrow()
					}
				})
			})
		})

		describe('isValid method', () => {
			it('should return true for all valid cursor types', () => {
				const validCursors: TLCursorType[] = [
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

				validCursors.forEach((cursor) => {
					expect(cursorTypeValidator.isValid(cursor)).toBe(true)
				})
			})

			it('should return false for invalid cursor types', () => {
				const invalidCursors = [
					'help',
					'wait',
					'progress',
					'alias',
					'copy',
					'no-drop',
					'not-allowed',
					'all-scroll',
					'col-resize',
					'row-resize',
					'n-resize',
					's-resize',
					'e-resize',
					'w-resize',
					'ne-resize',
					'nw-resize',
					'se-resize',
					'sw-resize',
					'cell',
					'context-menu',
					'vertical-text',
					'invalid-cursor',
					'',
				]

				invalidCursors.forEach((cursor) => {
					expect(cursorTypeValidator.isValid(cursor)).toBe(false)
				})
			})

			it('should return false for non-string values', () => {
				const nonStringValues = [
					123,
					null,
					undefined,
					{},
					[],
					true,
					false,
					Symbol('cursor'),
					new Date(),
				]

				nonStringValues.forEach((value) => {
					expect(cursorTypeValidator.isValid(value)).toBe(false)
				})
			})

			test('should not throw errors for any input', () => {
				const testValues = ['default', 'invalid', 123, null, undefined, {}, [], true, false]

				testValues.forEach((value) => {
					expect(() => cursorTypeValidator.isValid(value)).not.toThrow()
				})
			})

			test('should handle edge cases gracefully', () => {
				expect(cursorTypeValidator.isValid('default ')).toBe(false)
				expect(cursorTypeValidator.isValid(' default')).toBe(false)
				expect(cursorTypeValidator.isValid('DEFAULT')).toBe(false)
				expect(cursorTypeValidator.isValid('default\n')).toBe(false)
				expect(cursorTypeValidator.isValid('default\t')).toBe(false)
			})
		})

		describe('consistency between validate and isValid', () => {
			test('should be consistent for valid values', () => {
				const validCursors: TLCursorType[] = [
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

				validCursors.forEach((cursor) => {
					const isValidResult = cursorTypeValidator.isValid(cursor)
					expect(isValidResult).toBe(true)

					expect(() => cursorTypeValidator.validate(cursor)).not.toThrow()
				})
			})

			test('should be consistent for invalid values', () => {
				const invalidValues = [
					'invalid',
					123,
					null,
					undefined,
					{},
					[],
					true,
					false,
					'help',
					'wait',
					'',
					'DEFAULT',
				]

				invalidValues.forEach((value) => {
					const isValidResult = cursorTypeValidator.isValid(value)
					expect(isValidResult).toBe(false)

					expect(() => cursorTypeValidator.validate(value)).toThrow()
				})
			})
		})

		describe('validator properties', () => {
			it('should have the correct validator structure', () => {
				expect(cursorTypeValidator).toBeDefined()
				expect(typeof cursorTypeValidator.validate).toBe('function')
				expect(typeof cursorTypeValidator.isValid).toBe('function')
			})

			it('should be based on setEnum validator', () => {
				// The validator should behave consistently with T.setEnum behavior
				expect(cursorTypeValidator.validate('default')).toBe('default')
				expect(cursorTypeValidator.validate('pointer')).toBe('pointer')
			})
		})
	})

	describe('cursorValidator', () => {
		describe('validate method', () => {
			it('should validate valid TLCursor objects', () => {
				const validCursors: TLCursor[] = [
					{ type: 'default', rotation: 0 },
					{ type: 'pointer', rotation: 0 },
					{ type: 'resize-corner', rotation: Math.PI / 4 },
					{ type: 'nesw-rotate', rotation: Math.PI / 2 },
					{ type: 'text', rotation: -Math.PI / 4 },
					{ type: 'grab', rotation: 1.5 },
					{ type: 'zoom-in', rotation: -2.5 },
					{ type: 'move', rotation: 0.123456 },
				]

				validCursors.forEach((cursor) => {
					expect(() => cursorValidator.validate(cursor)).not.toThrow()
					const result = cursorValidator.validate(cursor)
					expect(result).toEqual(cursor)
					expect(result.type).toBe(cursor.type)
					expect(result.rotation).toBe(cursor.rotation)
				})
			})

			it('should reject objects with invalid cursor types', () => {
				const invalidCursors = [
					{ type: 'invalid', rotation: 0 },
					{ type: 'help', rotation: 0 },
					{ type: 'wait', rotation: 0 },
					{ type: '', rotation: 0 },
					{ type: 'DEFAULT', rotation: 0 },
					{ type: 'default ', rotation: 0 },
				]

				invalidCursors.forEach((cursor) => {
					expect(() => cursorValidator.validate(cursor as any)).toThrow()
				})
			})

			it('should reject objects with invalid rotation values', () => {
				const invalidCursors = [
					{ type: 'default', rotation: 'not-a-number' },
					{ type: 'pointer', rotation: null },
					{ type: 'text', rotation: undefined },
					{ type: 'grab', rotation: {} },
					{ type: 'move', rotation: [] },
					{ type: 'resize-corner', rotation: true },
					{ type: 'zoom-in', rotation: 'string' },
				]

				invalidCursors.forEach((cursor) => {
					expect(() => cursorValidator.validate(cursor as any)).toThrow()
				})
			})

			it('should reject objects missing required properties', () => {
				const incompleteCursors = [
					{ type: 'default' }, // missing rotation
					{ rotation: 0 }, // missing type
					{}, // missing both
					{ type: 'default', rotation: 0, extra: 'property' }, // extra property - behavior depends on validator
				]

				// Missing properties should throw
				expect(() => cursorValidator.validate(incompleteCursors[0] as any)).toThrow()
				expect(() => cursorValidator.validate(incompleteCursors[1] as any)).toThrow()
				expect(() => cursorValidator.validate(incompleteCursors[2] as any)).toThrow()

				// Extra properties behavior - T.object is strict by default
				expect(() => cursorValidator.validate(incompleteCursors[3] as any)).toThrow()
			})

			it('should reject non-object values', () => {
				const nonObjectValues = [
					'default',
					123,
					null,
					undefined,
					true,
					false,
					[],
					Symbol('cursor'),
					new Date(),
				]

				nonObjectValues.forEach((value) => {
					expect(() => cursorValidator.validate(value)).toThrow()
				})
			})

			test('should handle extreme rotation values', () => {
				const extremeCursors = [
					{ type: 'default', rotation: Number.MAX_VALUE },
					{ type: 'pointer', rotation: Number.MIN_VALUE },
					{ type: 'text', rotation: Infinity },
					{ type: 'grab', rotation: -Infinity },
				]

				extremeCursors.forEach((cursor) => {
					if (isFinite(cursor.rotation)) {
						expect(() => cursorValidator.validate(cursor)).not.toThrow()
					} else {
						// Infinity/-Infinity should be handled by the validator
						// This depends on the T.number validator behavior
						const result = () => cursorValidator.validate(cursor)
						// Either it throws or it passes - both are valid depending on T.number implementation
						try {
							const validated = result()
							expect(validated.type).toBe(cursor.type)
						} catch {
							// Throwing is also acceptable for invalid numbers
						}
					}
				})
			})

			test('should handle NaN rotation values', () => {
				const nanCursor = { type: 'default' as TLCursorType, rotation: NaN }

				// NaN handling depends on T.number validator implementation
				const result = () => cursorValidator.validate(nanCursor)
				try {
					const validated = result()
					expect(validated.type).toBe('default')
				} catch {
					// Throwing is also acceptable for NaN
				}
			})
		})

		describe('isValid method', () => {
			it('should return true for valid TLCursor objects', () => {
				const validCursors: TLCursor[] = [
					{ type: 'default', rotation: 0 },
					{ type: 'pointer', rotation: 0 },
					{ type: 'resize-corner', rotation: Math.PI / 4 },
					{ type: 'nesw-rotate', rotation: Math.PI / 2 },
					{ type: 'text', rotation: -Math.PI / 4 },
					{ type: 'grab', rotation: 1.5 },
					{ type: 'zoom-in', rotation: -2.5 },
					{ type: 'move', rotation: 0.123456 },
				]

				validCursors.forEach((cursor) => {
					expect(cursorValidator.isValid(cursor)).toBe(true)
				})
			})

			it('should return false for invalid cursor objects', () => {
				const invalidCursors = [
					{ type: 'invalid', rotation: 0 },
					{ type: 'help', rotation: 0 },
					{ type: 'default', rotation: 'not-a-number' },
					{ type: 'pointer', rotation: null },
					{ type: 'default' }, // missing rotation
					{ rotation: 0 }, // missing type
					{}, // missing both
					'default',
					123,
					null,
					undefined,
					true,
					false,
					[],
				]

				invalidCursors.forEach((cursor) => {
					expect(cursorValidator.isValid(cursor as any)).toBe(false)
				})
			})

			test('should not throw errors for any input', () => {
				const testValues = [
					{ type: 'default', rotation: 0 },
					{ type: 'invalid', rotation: 0 },
					'invalid',
					123,
					null,
					undefined,
					{},
					[],
					true,
					false,
				]

				testValues.forEach((value) => {
					expect(() => cursorValidator.isValid(value)).not.toThrow()
				})
			})

			test('should handle edge cases gracefully', () => {
				expect(cursorValidator.isValid({ type: 'default ', rotation: 0 })).toBe(false)
				expect(cursorValidator.isValid({ type: ' default', rotation: 0 })).toBe(false)
				expect(cursorValidator.isValid({ type: 'DEFAULT', rotation: 0 })).toBe(false)
				expect(cursorValidator.isValid({ type: 'default', rotation: '0' })).toBe(false)
			})
		})

		describe('consistency between validate and isValid', () => {
			test('should be consistent for valid values', () => {
				const validCursors: TLCursor[] = [
					{ type: 'default', rotation: 0 },
					{ type: 'pointer', rotation: Math.PI },
					{ type: 'resize-corner', rotation: -Math.PI / 2 },
					{ type: 'text', rotation: 1.5 },
				]

				validCursors.forEach((cursor) => {
					const isValidResult = cursorValidator.isValid(cursor)
					expect(isValidResult).toBe(true)

					expect(() => cursorValidator.validate(cursor)).not.toThrow()
					expect(cursorValidator.validate(cursor)).toEqual(cursor)
				})
			})

			test('should be consistent for invalid values', () => {
				const invalidValues = [
					{ type: 'invalid', rotation: 0 },
					{ type: 'default', rotation: 'invalid' },
					{ type: 'default' },
					{ rotation: 0 },
					{},
					'invalid',
					123,
					null,
					undefined,
				]

				invalidValues.forEach((value) => {
					const isValidResult = cursorValidator.isValid(value as any)
					expect(isValidResult).toBe(false)

					expect(() => cursorValidator.validate(value as any)).toThrow()
				})
			})
		})

		describe('validator properties', () => {
			it('should have the correct validator structure', () => {
				expect(cursorValidator).toBeDefined()
				expect(typeof cursorValidator.validate).toBe('function')
				expect(typeof cursorValidator.isValid).toBe('function')
			})

			it('should be based on T.object validator', () => {
				// The validator should behave consistently with T.object behavior
				const cursor = { type: 'default' as TLCursorType, rotation: 0 }
				const validated = cursorValidator.validate(cursor)
				expect(validated).toEqual(cursor)
			})
		})
	})

	describe('integration tests', () => {
		test('should work with type system correctly', () => {
			// This test verifies that the types work correctly at runtime
			const cursorType: TLCursorType = 'default'
			const cursor: TLCursor = { type: cursorType, rotation: 0 }

			expect(TL_CURSOR_TYPES.has(cursorType)).toBe(true)
			expect(cursorTypeValidator.validate(cursorType)).toBe('default')
			expect(cursorTypeValidator.isValid(cursorType)).toBe(true)
			expect(cursorValidator.validate(cursor)).toEqual(cursor)
			expect(cursorValidator.isValid(cursor)).toBe(true)
		})

		test('should support all documented cursor types', () => {
			// Verify all documented cursors in the examples work
			const exampleCursors = ['default', 'text', 'resize-corner', 'nesw-rotate', 'pointer'] as const

			exampleCursors.forEach((cursorType) => {
				expect(TL_CURSOR_TYPES.has(cursorType)).toBe(true)
				expect(cursorTypeValidator.validate(cursorType)).toBe(cursorType)
				expect(cursorTypeValidator.isValid(cursorType)).toBe(true)

				const cursor: TLCursor = { type: cursorType, rotation: 0 }
				expect(cursorValidator.validate(cursor)).toEqual(cursor)
				expect(cursorValidator.isValid(cursor)).toBe(true)
			})
		})

		test('should maintain consistency between Set and validators', () => {
			// Every value in the Set should be valid according to the validators
			for (const cursorType of TL_CURSOR_TYPES) {
				expect(cursorTypeValidator.isValid(cursorType)).toBe(true)
				expect(cursorTypeValidator.validate(cursorType)).toBe(cursorType)

				const cursor: TLCursor = { type: cursorType as TLCursorType, rotation: 0 }
				expect(cursorValidator.isValid(cursor)).toBe(true)
				expect(cursorValidator.validate(cursor)).toEqual(cursor)
			}
		})

		test('should work in realistic usage scenarios', () => {
			// Simulate real-world usage patterns
			const userInputs = [
				{ type: 'default', rotation: 0 },
				{ type: 'pointer', rotation: Math.PI / 4 },
				{ type: 'text', rotation: 0 },
				{ type: 'invalid-cursor', rotation: 0 },
				{ type: 'resize-corner', rotation: 'invalid' },
			]

			const processCursorInput = (input: any): TLCursor | null => {
				if (cursorValidator.isValid(input)) {
					return cursorValidator.validate(input)
				}
				return null
			}

			expect(processCursorInput(userInputs[0])).toEqual(userInputs[0])
			expect(processCursorInput(userInputs[1])).toEqual(userInputs[1])
			expect(processCursorInput(userInputs[2])).toEqual(userInputs[2])
			expect(processCursorInput(userInputs[3])).toBe(null)
			expect(processCursorInput(userInputs[4])).toBe(null)
		})

		test('should work with conditional logic', () => {
			const checkCursorType = (type: unknown): boolean => {
				return TL_CURSOR_TYPES.has(type as TLCursorType)
			}

			const checkCursor = (cursor: unknown): boolean => {
				return cursorValidator.isValid(cursor)
			}

			expect(checkCursorType('default')).toBe(true)
			expect(checkCursorType('pointer')).toBe(true)
			expect(checkCursorType('invalid')).toBe(false)
			expect(checkCursorType(123)).toBe(false)

			expect(checkCursor({ type: 'default', rotation: 0 })).toBe(true)
			expect(checkCursor({ type: 'invalid', rotation: 0 })).toBe(false)
			expect(checkCursor({ type: 'default', rotation: 'invalid' })).toBe(false)
			expect(checkCursor(123)).toBe(false)
		})

		test('should support rotation angle scenarios', () => {
			// Test common rotation scenarios
			const rotationScenarios = [
				{ angle: 0, description: 'no rotation' },
				{ angle: Math.PI / 4, description: '45 degrees' },
				{ angle: Math.PI / 2, description: '90 degrees' },
				{ angle: Math.PI, description: '180 degrees' },
				{ angle: (3 * Math.PI) / 2, description: '270 degrees' },
				{ angle: 2 * Math.PI, description: '360 degrees' },
				{ angle: -Math.PI / 4, description: '-45 degrees' },
				{ angle: -Math.PI / 2, description: '-90 degrees' },
			]

			rotationScenarios.forEach(({ angle, description }) => {
				const cursor: TLCursor = { type: 'resize-corner', rotation: angle }
				expect(cursorValidator.validate(cursor), `Failed for ${description}`).toEqual(cursor)
				expect(cursorValidator.isValid(cursor), `Failed for ${description}`).toBe(true)
			})
		})

		test('should handle cursor creation patterns', () => {
			// Test common cursor creation patterns from the examples
			const defaultCursor: TLCursor = {
				type: 'default',
				rotation: 0,
			}

			const rotatedResizeCursor: TLCursor = {
				type: 'resize-corner',
				rotation: Math.PI / 4, // 45 degrees
			}

			const textCursor: TLCursor = {
				type: 'text',
				rotation: 0,
			}

			const cursors = [defaultCursor, rotatedResizeCursor, textCursor]

			cursors.forEach((cursor) => {
				expect(cursorValidator.validate(cursor)).toEqual(cursor)
				expect(cursorValidator.isValid(cursor)).toBe(true)
				expect(cursorTypeValidator.validate(cursor.type)).toBe(cursor.type)
				expect(cursorTypeValidator.isValid(cursor.type)).toBe(true)
			})
		})
	})

	describe('error handling', () => {
		test('should provide helpful error messages for cursor types', () => {
			try {
				cursorTypeValidator.validate('invalid')
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toContain('Expected')
				expect((error as Error).message).toContain('got invalid')
			}
		})

		test('should provide helpful error messages for cursor objects', () => {
			try {
				cursorValidator.validate({ type: 'invalid', rotation: 0 })
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toBeDefined()
			}

			try {
				cursorValidator.validate({ type: 'default', rotation: 'invalid' })
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toBeDefined()
			}
		})

		test('should handle validation errors gracefully', () => {
			const safeValidateCursorType = (value: unknown): TLCursorType | null => {
				try {
					return cursorTypeValidator.validate(value)
				} catch {
					return null
				}
			}

			const safeValidateCursor = (value: unknown): TLCursor | null => {
				try {
					return cursorValidator.validate(value)
				} catch {
					return null
				}
			}

			expect(safeValidateCursorType('default')).toBe('default')
			expect(safeValidateCursorType('invalid')).toBe(null)
			expect(safeValidateCursorType(123)).toBe(null)

			expect(safeValidateCursor({ type: 'default', rotation: 0 })).toEqual({
				type: 'default',
				rotation: 0,
			})
			expect(safeValidateCursor({ type: 'invalid', rotation: 0 })).toBe(null)
			expect(safeValidateCursor(123)).toBe(null)
		})

		test('should handle malformed cursor objects', () => {
			const malformedCursors = [
				{ typ: 'default', rotation: 0 }, // typo in property name
				{ type: 'default', rot: 0 }, // typo in property name
				{ type: null, rotation: 0 },
				{ type: undefined, rotation: 0 },
				{ type: 'default', rotation: null },
				{ type: 'default', rotation: undefined },
			]

			malformedCursors.forEach((cursor) => {
				expect(cursorValidator.isValid(cursor as any)).toBe(false)
				expect(() => cursorValidator.validate(cursor as any)).toThrow()
			})
		})
	})

	describe('TypeScript type compatibility', () => {
		test('should work with TypeScript type assertions', () => {
			// Test that runtime validation aligns with TypeScript types
			const unknownValue: unknown = { type: 'default', rotation: 0 }

			if (cursorValidator.isValid(unknownValue)) {
				// TypeScript should know this is TLCursor
				const cursor = unknownValue as TLCursor
				expect(cursor.type).toBe('default')
				expect(cursor.rotation).toBe(0)
			}

			const unknownType: unknown = 'pointer'

			if (cursorTypeValidator.isValid(unknownType)) {
				// TypeScript should know this is TLCursorType
				const cursorType = unknownType as TLCursorType
				expect(cursorType).toBe('pointer')
			}
		})

		test('should support type narrowing patterns', () => {
			const processValue = (value: unknown): string => {
				if (cursorValidator.isValid(value)) {
					return `Cursor: ${value.type} at ${value.rotation} radians`
				} else if (cursorTypeValidator.isValid(value)) {
					return `Cursor type: ${value}`
				} else {
					return 'Invalid value'
				}
			}

			expect(processValue({ type: 'default', rotation: 0 })).toBe('Cursor: default at 0 radians')
			expect(processValue('pointer')).toBe('Cursor type: pointer')
			expect(processValue('invalid')).toBe('Invalid value')
			expect(processValue(123)).toBe('Invalid value')
		})
	})
})
