import type { RecordId, UnknownRecord } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { idValidator } from './id-validator'

// Mock record types for testing
interface MockShapeRecord extends UnknownRecord {
	typeName: 'shape'
}

interface MockPageRecord extends UnknownRecord {
	typeName: 'page'
}

interface MockAssetRecord extends UnknownRecord {
	typeName: 'asset'
}

interface MockBindingRecord extends UnknownRecord {
	typeName: 'binding'
}

type MockShapeId = RecordId<MockShapeRecord>
type MockPageId = RecordId<MockPageRecord>
type MockAssetId = RecordId<MockAssetRecord>
type MockBindingId = RecordId<MockBindingRecord>

describe('idValidator', () => {
	describe('basic functionality', () => {
		it('should be a function', () => {
			expect(typeof idValidator).toBe('function')
		})

		it('should return a validator object', () => {
			const validator = idValidator<MockShapeId>('shape')

			expect(validator).toBeDefined()
			expect(typeof validator.validate).toBe('function')
			expect(typeof validator.isValid).toBe('function')
		})

		it('should create validators for different record types', () => {
			const shapeValidator = idValidator<MockShapeId>('shape')
			const pageValidator = idValidator<MockPageId>('page')
			const assetValidator = idValidator<MockAssetId>('asset')
			const bindingValidator = idValidator<MockBindingId>('binding')

			expect(shapeValidator).toBeDefined()
			expect(pageValidator).toBeDefined()
			expect(assetValidator).toBeDefined()
			expect(bindingValidator).toBeDefined()
		})
	})

	describe('shape ID validation', () => {
		const shapeValidator = idValidator<MockShapeId>('shape')

		describe('validate method', () => {
			it('should validate correct shape IDs', () => {
				const validIds = [
					'shape:abc123',
					'shape:xyz789',
					'shape:my-custom-id',
					'shape:shape1',
					'shape:test_id_123',
					'shape:a',
					'shape:123',
					'shape:UUID-like-id-abc-123-def-456',
				]

				validIds.forEach((id) => {
					expect(() => shapeValidator.validate(id)).not.toThrow()
					expect(shapeValidator.validate(id)).toBe(id)
				})
			})

			it('should reject IDs with wrong prefix', () => {
				const invalidIds = [
					'page:abc123',
					'asset:xyz789',
					'binding:test',
					'document:main',
					'camera:view',
					'instance:user',
				]

				invalidIds.forEach((id) => {
					expect(() => shapeValidator.validate(id)).toThrow('shape ID must start with "shape:"')
				})
			})

			it('should reject IDs without any prefix', () => {
				const invalidIds = ['abc123', 'xyz789', 'test-id', '123', '', 'no-colon-here']

				invalidIds.forEach((id) => {
					expect(() => shapeValidator.validate(id)).toThrow('shape ID must start with "shape:"')
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
					Symbol('shape'),
					new Date(),
				]

				nonStringValues.forEach((value) => {
					expect(() => shapeValidator.validate(value)).toThrow()
				})
			})

			it('should provide specific error message for wrong prefix', () => {
				expect(() => shapeValidator.validate('page:abc123')).toThrow(
					'shape ID must start with "shape:"'
				)
				expect(() => shapeValidator.validate('asset:xyz')).toThrow(
					'shape ID must start with "shape:"'
				)
				expect(() => shapeValidator.validate('invalid')).toThrow(
					'shape ID must start with "shape:"'
				)
			})

			test('should handle edge cases', () => {
				// Just the prefix (no ID part)
				expect(() => shapeValidator.validate('shape:')).not.toThrow()
				expect(shapeValidator.validate('shape:')).toBe('shape:')

				// Prefix with special characters in ID part
				expect(() => shapeValidator.validate('shape:!@#$%^&*()')).not.toThrow()
				expect(shapeValidator.validate('shape:!@#$%^&*()')).toBe('shape:!@#$%^&*()')

				// Prefix with whitespace in ID part
				expect(() => shapeValidator.validate('shape: test ')).not.toThrow()
				expect(shapeValidator.validate('shape: test ')).toBe('shape: test ')

				// Prefix with newlines/tabs in ID part
				expect(() => shapeValidator.validate('shape:test\nline')).not.toThrow()
				expect(shapeValidator.validate('shape:test\ttab')).toBe('shape:test\ttab')
			})

			test('should be case-sensitive for prefix', () => {
				const caseSensitiveTests = [
					{ input: 'SHAPE:abc123', shouldPass: false },
					{ input: 'Shape:abc123', shouldPass: false },
					{ input: 'shape:abc123', shouldPass: true },
					{ input: 'sHaPe:abc123', shouldPass: false },
				]

				caseSensitiveTests.forEach(({ input, shouldPass }) => {
					if (shouldPass) {
						expect(() => shapeValidator.validate(input)).not.toThrow()
					} else {
						expect(() => shapeValidator.validate(input)).toThrow(
							'shape ID must start with "shape:"'
						)
					}
				})
			})
		})

		describe('isValid method', () => {
			it('should return true for valid shape IDs', () => {
				const validIds = [
					'shape:abc123',
					'shape:xyz789',
					'shape:my-custom-id',
					'shape:shape1',
					'shape:test_id_123',
					'shape:',
				]

				validIds.forEach((id) => {
					expect(shapeValidator.isValid(id)).toBe(true)
				})
			})

			it('should return false for invalid shape IDs', () => {
				const invalidIds = [
					'page:abc123',
					'asset:xyz789',
					'binding:test',
					'abc123',
					'',
					'no-colon',
					'SHAPE:abc123',
					'Shape:abc123',
				]

				invalidIds.forEach((id) => {
					expect(shapeValidator.isValid(id)).toBe(false)
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
					Symbol('shape'),
					new Date(),
				]

				nonStringValues.forEach((value) => {
					expect(shapeValidator.isValid(value)).toBe(false)
				})
			})

			test('should not throw errors for any input', () => {
				const testValues = [
					'shape:valid',
					'invalid',
					123,
					null,
					undefined,
					{},
					[],
					true,
					false,
					'',
					'SHAPE:abc',
				]

				testValues.forEach((value) => {
					expect(() => shapeValidator.isValid(value)).not.toThrow()
				})
			})
		})

		describe('consistency between validate and isValid', () => {
			test('should be consistent for valid values', () => {
				const validIds = [
					'shape:abc123',
					'shape:xyz789',
					'shape:my-custom-id',
					'shape:',
					'shape:123',
				]

				validIds.forEach((id) => {
					const isValidResult = shapeValidator.isValid(id)
					expect(isValidResult).toBe(true)
					expect(() => shapeValidator.validate(id)).not.toThrow()
				})
			})

			test('should be consistent for invalid values', () => {
				const invalidValues = [
					'page:abc123',
					'invalid',
					123,
					null,
					undefined,
					{},
					[],
					true,
					false,
					'',
					'SHAPE:abc',
				]

				invalidValues.forEach((value) => {
					const isValidResult = shapeValidator.isValid(value)
					expect(isValidResult).toBe(false)
					expect(() => shapeValidator.validate(value)).toThrow()
				})
			})
		})
	})

	describe('page ID validation', () => {
		const pageValidator = idValidator<MockPageId>('page')

		describe('validate method', () => {
			it('should validate correct page IDs', () => {
				const validIds = [
					'page:main',
					'page:page1',
					'page:design-v1',
					'page:test_page_123',
					'page:a',
					'page:123',
					'page:',
				]

				validIds.forEach((id) => {
					expect(() => pageValidator.validate(id)).not.toThrow()
					expect(pageValidator.validate(id)).toBe(id)
				})
			})

			it('should reject IDs with wrong prefix', () => {
				const invalidIds = ['shape:abc123', 'asset:xyz789', 'binding:test', 'document:main']

				invalidIds.forEach((id) => {
					expect(() => pageValidator.validate(id)).toThrow('page ID must start with "page:"')
				})
			})

			it('should provide specific error message for page IDs', () => {
				expect(() => pageValidator.validate('shape:abc123')).toThrow(
					'page ID must start with "page:"'
				)
				expect(() => pageValidator.validate('invalid')).toThrow('page ID must start with "page:"')
			})
		})

		describe('isValid method', () => {
			it('should return true for valid page IDs', () => {
				const validIds = ['page:main', 'page:page1', 'page:']

				validIds.forEach((id) => {
					expect(pageValidator.isValid(id)).toBe(true)
				})
			})

			it('should return false for invalid page IDs', () => {
				const invalidIds = ['shape:abc123', 'asset:xyz789', 'invalid', '']

				invalidIds.forEach((id) => {
					expect(pageValidator.isValid(id)).toBe(false)
				})
			})
		})
	})

	describe('asset ID validation', () => {
		const assetValidator = idValidator<MockAssetId>('asset')

		describe('validate method', () => {
			it('should validate correct asset IDs', () => {
				const validIds = [
					'asset:image123',
					'asset:video456',
					'asset:bookmark789',
					'asset:my-asset',
					'asset:test_asset_123',
					'asset:',
				]

				validIds.forEach((id) => {
					expect(() => assetValidator.validate(id)).not.toThrow()
					expect(assetValidator.validate(id)).toBe(id)
				})
			})

			it('should reject IDs with wrong prefix', () => {
				const invalidIds = ['shape:abc123', 'page:main', 'binding:test']

				invalidIds.forEach((id) => {
					expect(() => assetValidator.validate(id)).toThrow('asset ID must start with "asset:"')
				})
			})

			it('should provide specific error message for asset IDs', () => {
				expect(() => assetValidator.validate('page:main')).toThrow(
					'asset ID must start with "asset:"'
				)
				expect(() => assetValidator.validate('invalid')).toThrow(
					'asset ID must start with "asset:"'
				)
			})
		})
	})

	describe('binding ID validation', () => {
		const bindingValidator = idValidator<MockBindingId>('binding')

		describe('validate method', () => {
			it('should validate correct binding IDs', () => {
				const validIds = [
					'binding:arrow123',
					'binding:connection456',
					'binding:link789',
					'binding:test-binding',
					'binding:',
				]

				validIds.forEach((id) => {
					expect(() => bindingValidator.validate(id)).not.toThrow()
					expect(bindingValidator.validate(id)).toBe(id)
				})
			})

			it('should reject IDs with wrong prefix', () => {
				const invalidIds = ['shape:abc123', 'page:main', 'asset:image']

				invalidIds.forEach((id) => {
					expect(() => bindingValidator.validate(id)).toThrow(
						'binding ID must start with "binding:"'
					)
				})
			})

			it('should provide specific error message for binding IDs', () => {
				expect(() => bindingValidator.validate('shape:abc123')).toThrow(
					'binding ID must start with "binding:"'
				)
				expect(() => bindingValidator.validate('invalid')).toThrow(
					'binding ID must start with "binding:"'
				)
			})
		})
	})

	describe('multiple validator instances', () => {
		it('should create independent validators for different prefixes', () => {
			const shapeValidator = idValidator<MockShapeId>('shape')
			const pageValidator = idValidator<MockPageId>('page')
			const assetValidator = idValidator<MockAssetId>('asset')

			// Each validator should only accept its own prefix
			expect(shapeValidator.isValid('shape:abc123')).toBe(true)
			expect(shapeValidator.isValid('page:abc123')).toBe(false)
			expect(shapeValidator.isValid('asset:abc123')).toBe(false)

			expect(pageValidator.isValid('shape:abc123')).toBe(false)
			expect(pageValidator.isValid('page:abc123')).toBe(true)
			expect(pageValidator.isValid('asset:abc123')).toBe(false)

			expect(assetValidator.isValid('shape:abc123')).toBe(false)
			expect(assetValidator.isValid('page:abc123')).toBe(false)
			expect(assetValidator.isValid('asset:abc123')).toBe(true)
		})

		it('should create validators with the same prefix independently', () => {
			const validator1 = idValidator<MockShapeId>('shape')
			const validator2 = idValidator<MockShapeId>('shape')

			// Both should work the same way
			expect(validator1.isValid('shape:abc123')).toBe(true)
			expect(validator2.isValid('shape:abc123')).toBe(true)

			expect(validator1.isValid('page:abc123')).toBe(false)
			expect(validator2.isValid('page:abc123')).toBe(false)

			// They should be separate instances
			expect(validator1).not.toBe(validator2)
		})
	})

	describe('validator properties', () => {
		const validator = idValidator<MockShapeId>('shape')

		it('should have the correct validator structure', () => {
			expect(validator).toBeDefined()
			expect(typeof validator.validate).toBe('function')
			expect(typeof validator.isValid).toBe('function')
		})

		it('should be based on T.string validator', () => {
			// The validator should behave like a refined string validator
			expect(validator.validate('shape:abc123')).toBe('shape:abc123')
			expect(typeof validator.validate('shape:test')).toBe('string')
		})

		it('should extend T.Validator interface', () => {
			// Should have standard validator methods
			expect('validate' in validator).toBe(true)
			expect('isValid' in validator).toBe(true)
		})
	})

	describe('integration with T.string.refine', () => {
		const validator = idValidator<MockShapeId>('shape')

		it('should work like a refined string validator', () => {
			// Should pass through valid strings
			const result = validator.validate('shape:test123')
			expect(typeof result).toBe('string')
			expect(result).toBe('shape:test123')
		})

		it('should throw validation errors for invalid strings', () => {
			// Should throw on invalid strings
			expect(() => validator.validate('invalid')).toThrow()
			expect(() => validator.validate('')).toThrow()
			expect(() => validator.validate('page:test')).toThrow()
		})

		it('should validate string type first', () => {
			// Non-strings should be rejected by the underlying string validator
			expect(() => validator.validate(123)).toThrow()
			expect(() => validator.validate(null)).toThrow()
			expect(() => validator.validate(undefined)).toThrow()
			expect(() => validator.validate({})).toThrow()
		})

		test('should support chaining with other validators if needed', () => {
			// Create a composite validator (this tests the validator is composable)
			const compositeValidator = T.object({
				id: validator,
				name: T.string,
			})

			const validData = {
				id: 'shape:abc123',
				name: 'My Shape',
			}

			expect(() => compositeValidator.validate(validData)).not.toThrow()
			expect(compositeValidator.validate(validData)).toEqual(validData)

			const invalidData = {
				id: 'page:abc123', // Wrong prefix
				name: 'My Shape',
			}

			expect(() => compositeValidator.validate(invalidData)).toThrow()
		})
	})

	describe('realistic usage scenarios', () => {
		test('should work in shape validation contexts', () => {
			const shapeValidator = idValidator<MockShapeId>('shape')

			// Mock shape record validation
			const validateShapeRecord = (data: any) => {
				return T.object({
					id: shapeValidator,
					typeName: T.literal('shape'),
					type: T.string,
					x: T.number,
					y: T.number,
				}).validate(data)
			}

			const validShape = {
				id: 'shape:rect123',
				typeName: 'shape',
				type: 'geo',
				x: 100,
				y: 200,
			}

			expect(() => validateShapeRecord(validShape)).not.toThrow()

			const invalidShape = {
				id: 'page:rect123', // Wrong prefix
				typeName: 'shape',
				type: 'geo',
				x: 100,
				y: 200,
			}

			expect(() => validateShapeRecord(invalidShape)).toThrow()
		})

		test('should work with safe validation patterns', () => {
			const validator = idValidator<MockPageId>('page')

			const safeValidate = (value: unknown): MockPageId | null => {
				try {
					return validator.validate(value)
				} catch {
					return null
				}
			}

			expect(safeValidate('page:main')).toBe('page:main')
			expect(safeValidate('shape:abc123')).toBe(null)
			expect(safeValidate('invalid')).toBe(null)
			expect(safeValidate(123)).toBe(null)
			expect(safeValidate(null)).toBe(null)
		})

		test('should work with conditional validation', () => {
			const shapeValidator = idValidator<MockShapeId>('shape')
			const pageValidator = idValidator<MockPageId>('page')

			const validateIdByType = (id: string, expectedType: 'shape' | 'page') => {
				switch (expectedType) {
					case 'shape':
						return shapeValidator.validate(id)
					case 'page':
						return pageValidator.validate(id)
				}
			}

			expect(() => validateIdByType('shape:abc123', 'shape')).not.toThrow()
			expect(() => validateIdByType('page:main', 'page')).not.toThrow()

			expect(() => validateIdByType('shape:abc123', 'page')).toThrow()
			expect(() => validateIdByType('page:main', 'shape')).toThrow()
		})

		test('should work in array validation', () => {
			const shapeValidator = idValidator<MockShapeId>('shape')
			const shapeIdsValidator = T.arrayOf(shapeValidator)

			const validIds = ['shape:rect1', 'shape:circle2', 'shape:line3']
			const invalidIds = ['shape:rect1', 'page:main', 'shape:line3']

			expect(() => shapeIdsValidator.validate(validIds)).not.toThrow()
			expect(shapeIdsValidator.validate(validIds)).toEqual(validIds)

			expect(() => shapeIdsValidator.validate(invalidIds)).toThrow()
		})
	})

	describe('error handling', () => {
		const validator = idValidator<MockShapeId>('shape')

		test('should provide helpful error messages', () => {
			try {
				validator.validate('page:abc123')
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toBe('shape ID must start with "shape:"')
			}

			try {
				validator.validate('invalid')
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toBe('shape ID must start with "shape:"')
			}
		})

		test('should handle string validation errors from underlying validator', () => {
			// Non-string values should be rejected by T.string first
			expect(() => validator.validate(123)).toThrow()
			expect(() => validator.validate(null)).toThrow()
			expect(() => validator.validate(undefined)).toThrow()
		})

		test('should handle edge cases gracefully', () => {
			// Empty string edge case
			expect(() => validator.validate('')).toThrow('shape ID must start with "shape:"')

			// Near-miss edge cases
			expect(() => validator.validate('shap:abc123')).toThrow('shape ID must start with "shape:"')
			expect(() => validator.validate('shapee:abc123')).toThrow('shape ID must start with "shape:"')
			expect(() => validator.validate('shape')).toThrow('shape ID must start with "shape:"')
		})
	})

	describe('type system integration', () => {
		test('should work with TypeScript type system correctly', () => {
			const shapeValidator = idValidator<MockShapeId>('shape')

			// The validator should maintain proper typing
			const validatedId: MockShapeId = shapeValidator.validate('shape:abc123')
			expect(typeof validatedId).toBe('string')
			expect(validatedId).toBe('shape:abc123')

			// Should work with conditional types
			const conditionalValidate = <T extends RecordId<UnknownRecord>>(
				id: string,
				validator: T.Validator<T>
			): T => {
				return validator.validate(id)
			}

			const result = conditionalValidate('shape:test', shapeValidator)
			expect(result).toBe('shape:test')
		})

		test('should support generic usage patterns', () => {
			// Generic helper function using the validator
			const createIdValidator = <T extends RecordId<UnknownRecord>>(
				prefix: T['__type__']['typeName']
			): T.Validator<T> => {
				return idValidator<T>(prefix)
			}

			const genericShapeValidator = createIdValidator<MockShapeId>('shape')
			const genericPageValidator = createIdValidator<MockPageId>('page')

			expect(genericShapeValidator.isValid('shape:abc123')).toBe(true)
			expect(genericPageValidator.isValid('page:main')).toBe(true)

			expect(genericShapeValidator.isValid('page:main')).toBe(false)
			expect(genericPageValidator.isValid('shape:abc123')).toBe(false)
		})
	})

	describe('performance and edge cases', () => {
		const validator = idValidator<MockShapeId>('shape')

		test('should handle very long IDs', () => {
			const longId = 'shape:' + 'a'.repeat(10000)
			expect(() => validator.validate(longId)).not.toThrow()
			expect(validator.validate(longId)).toBe(longId)
		})

		test('should handle IDs with unicode characters', () => {
			const unicodeIds = ['shape:测试', 'shape:🎨', 'shape:café', 'shape:Москва', 'shape:العربية']

			unicodeIds.forEach((id) => {
				expect(() => validator.validate(id)).not.toThrow()
				expect(validator.validate(id)).toBe(id)
			})
		})

		test('should handle repeated validation calls efficiently', () => {
			const id = 'shape:test123'

			// Multiple calls should be consistent
			for (let i = 0; i < 100; i++) {
				expect(validator.validate(id)).toBe(id)
				expect(validator.isValid(id)).toBe(true)
			}
		})

		test('should handle mixed valid/invalid calls', () => {
			const testCases = [
				{ id: 'shape:valid1', expected: true },
				{ id: 'page:invalid1', expected: false },
				{ id: 'shape:valid2', expected: true },
				{ id: 'invalid', expected: false },
				{ id: 'shape:valid3', expected: true },
			]

			testCases.forEach(({ id, expected }) => {
				expect(validator.isValid(id)).toBe(expected)
				if (expected) {
					expect(() => validator.validate(id)).not.toThrow()
				} else {
					expect(() => validator.validate(id)).toThrow()
				}
			})
		})
	})
})
