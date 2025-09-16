import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { TLBindingId } from '../records/TLBinding'
import { TLShapeId } from '../records/TLShape'
import { TLBaseBinding, bindingIdValidator, createBindingValidator } from './TLBaseBinding'

describe('TLBaseBinding', () => {
	describe('TLBaseBinding interface', () => {
		it('should represent valid binding structure', () => {
			// Create a concrete binding extending TLBaseBinding
			interface TestBinding extends TLBaseBinding<'test', { value: string; flag: boolean }> {}

			const validBinding: TestBinding = {
				id: 'binding:test123' as TLBindingId,
				typeName: 'binding',
				type: 'test',
				fromId: 'shape:source1' as TLShapeId,
				toId: 'shape:target1' as TLShapeId,
				props: {
					value: 'hello',
					flag: true,
				},
				meta: {},
			}

			expect(validBinding.id).toBe('binding:test123')
			expect(validBinding.typeName).toBe('binding')
			expect(validBinding.type).toBe('test')
			expect(validBinding.fromId).toBe('shape:source1')
			expect(validBinding.toId).toBe('shape:target1')
			expect(validBinding.props.value).toBe('hello')
			expect(validBinding.props.flag).toBe(true)
			expect(validBinding.meta).toEqual({})
		})

		it('should support different prop types', () => {
			interface CustomProps {
				count: number
				name: string
				options: string[]
			}

			interface CustomBinding extends TLBaseBinding<'custom', CustomProps> {}

			const binding: CustomBinding = {
				id: 'binding:custom123' as TLBindingId,
				typeName: 'binding',
				type: 'custom',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {
					count: 42,
					name: 'test binding',
					options: ['option1', 'option2'],
				},
				meta: {
					created: '2023-01-01',
					author: 'test-user',
				},
			}

			expect(binding.props.count).toBe(42)
			expect(binding.props.name).toBe('test binding')
			expect(binding.props.options).toEqual(['option1', 'option2'])
			expect(binding.meta.created).toBe('2023-01-01')
		})

		it('should support empty props and meta', () => {
			interface MinimalBinding extends TLBaseBinding<'minimal', {}> {}

			const binding: MinimalBinding = {
				id: 'binding:minimal123' as TLBindingId,
				typeName: 'binding',
				type: 'minimal',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {},
				meta: {},
			}

			expect(binding.props).toEqual({})
			expect(binding.meta).toEqual({})
		})

		it('should support complex meta objects', () => {
			interface MetaBinding extends TLBaseBinding<'meta', { simple: boolean }> {}

			const binding: MetaBinding = {
				id: 'binding:meta123' as TLBindingId,
				typeName: 'binding',
				type: 'meta',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {
					simple: true,
				},
				meta: {
					version: 1,
					tags: ['important', 'custom'],
					config: {
						enabled: true,
						priority: 'high',
					},
					timestamps: {
						created: 1672531200000,
						modified: 1672617600000,
					},
				},
			}

			expect(binding.meta.version).toBe(1)
			expect(binding.meta.tags).toEqual(['important', 'custom'])
			expect(binding.meta.config).toEqual({ enabled: true, priority: 'high' })
			expect(binding.meta.timestamps).toEqual({
				created: 1672531200000,
				modified: 1672617600000,
			})
		})
	})

	describe('bindingIdValidator', () => {
		it('should validate correct binding IDs', () => {
			const validIds = [
				'binding:abc123',
				'binding:arrow_binding_1',
				'binding:custom-binding-name',
				'binding:123456789',
				'binding:uuid-style-id-12345',
				'binding:a',
				'binding:very_long_binding_id_with_underscores_and_numbers_123',
			]

			validIds.forEach((id) => {
				expect(() => bindingIdValidator.validate(id)).not.toThrow()
				expect(bindingIdValidator.validate(id)).toBe(id)
			})
		})

		it('should reject invalid binding IDs', () => {
			const invalidIds = [
				'shape:abc123', // Wrong prefix
				'page:abc123', // Wrong prefix
				'asset:abc123', // Wrong prefix
				'binding', // Missing colon and ID
				':abc123', // Missing prefix
				'BINDING:abc123', // Wrong case
				'Binding:abc123', // Wrong case
				'abc123', // No prefix at all
				'', // Empty string
				'custom:abc123', // Custom prefix
			]

			invalidIds.forEach((id) => {
				expect(() => bindingIdValidator.validate(id)).toThrow()
			})
		})

		it('should accept edge case valid binding IDs', () => {
			// These IDs are technically valid according to the id validator
			const edgeCaseValidIds = [
				'binding:', // Empty ID part is allowed
				'binding::', // Double colon is allowed after the prefix
			]

			edgeCaseValidIds.forEach((id) => {
				expect(() => bindingIdValidator.validate(id)).not.toThrow()
				expect(bindingIdValidator.validate(id)).toBe(id)
				expect(bindingIdValidator.isValid(id)).toBe(true)
			})
		})

		it('should check isValid method', () => {
			expect(bindingIdValidator.isValid('binding:abc123')).toBe(true)
			expect(bindingIdValidator.isValid('binding:test')).toBe(true)
			expect(bindingIdValidator.isValid('binding:123')).toBe(true)

			expect(bindingIdValidator.isValid('shape:abc123')).toBe(false)
			expect(bindingIdValidator.isValid('binding')).toBe(false)
			expect(bindingIdValidator.isValid('')).toBe(false)
			// Note: 'binding:' with empty ID part is actually valid according to the id validator
			expect(bindingIdValidator.isValid('binding:')).toBe(true)
			expect(bindingIdValidator.isValid(null as any)).toBe(false)
			expect(bindingIdValidator.isValid(undefined as any)).toBe(false)
		})

		it('should provide correct error messages', () => {
			expect(() => bindingIdValidator.validate('shape:abc123')).toThrow(
				'binding ID must start with "binding:"'
			)
			expect(() => bindingIdValidator.validate('page:test')).toThrow(
				'binding ID must start with "binding:"'
			)
			expect(() => bindingIdValidator.validate('invalid')).toThrow(
				'binding ID must start with "binding:"'
			)
		})

		it('should handle edge cases', () => {
			const edgeCases = [
				123, // Number
				{}, // Object
				[], // Array
				true, // Boolean
				null, // Null
				undefined, // Undefined
			]

			edgeCases.forEach((value) => {
				expect(() => bindingIdValidator.validate(value as any)).toThrow()
				expect(bindingIdValidator.isValid(value as any)).toBe(false)
			})
		})
	})

	describe('createBindingValidator', () => {
		it('should create validator for simple binding without custom props or meta', () => {
			const validator = createBindingValidator('simple')

			const validBinding = {
				id: 'binding:simple123',
				typeName: 'binding',
				type: 'simple',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: {},
				meta: {},
			}

			expect(() => validator.validate(validBinding)).not.toThrow()
			const result = validator.validate(validBinding)
			expect(result).toEqual(validBinding)
		})

		it('should create validator with custom props validation', () => {
			const propsValidation = {
				name: T.string,
				count: T.number,
				enabled: T.boolean,
			}

			const validator = createBindingValidator('custom', propsValidation)

			const validBinding = {
				id: 'binding:custom123',
				typeName: 'binding',
				type: 'custom',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: {
					name: 'test',
					count: 42,
					enabled: true,
				},
				meta: {},
			}

			expect(() => validator.validate(validBinding)).not.toThrow()
			const result = validator.validate(validBinding)
			expect(result).toEqual(validBinding)
		})

		it('should create validator with custom meta validation', () => {
			const metaValidation = {
				version: T.number,
				author: T.string,
			}

			const validator = createBindingValidator('meta', undefined, metaValidation)

			const validBinding = {
				id: 'binding:meta123',
				typeName: 'binding',
				type: 'meta',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: {},
				meta: {
					version: 1,
					author: 'test-user',
				},
			}

			expect(() => validator.validate(validBinding)).not.toThrow()
			const result = validator.validate(validBinding)
			expect(result).toEqual(validBinding)
		})

		it('should create validator with both custom props and meta validation', () => {
			const propsValidation = {
				strength: T.number,
				color: T.string,
			}

			const metaValidation = {
				createdAt: T.number,
				tags: T.arrayOf(T.string),
			}

			const validator = createBindingValidator('full', propsValidation, metaValidation)

			const validBinding = {
				id: 'binding:full123',
				typeName: 'binding',
				type: 'full',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: {
					strength: 0.8,
					color: 'red',
				},
				meta: {
					createdAt: 1672531200000,
					tags: ['important', 'custom'],
				},
			}

			expect(() => validator.validate(validBinding)).not.toThrow()
			const result = validator.validate(validBinding)
			expect(result).toEqual(validBinding)
		})

		it('should validate base binding properties strictly', () => {
			const validator = createBindingValidator('strict')

			// Test invalid id
			expect(() =>
				validator.validate({
					id: 'shape:invalid',
					typeName: 'binding',
					type: 'strict',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {},
				})
			).toThrow()

			// Test invalid typeName
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'shape',
					type: 'strict',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {},
				})
			).toThrow()

			// Test invalid type
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'wrong',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {},
				})
			).toThrow()

			// Test invalid fromId
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'strict',
					fromId: 'invalid:from1',
					toId: 'shape:to1',
					props: {},
					meta: {},
				})
			).toThrow()

			// Test invalid toId
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'strict',
					fromId: 'shape:from1',
					toId: 'invalid:to1',
					props: {},
					meta: {},
				})
			).toThrow()
		})

		it('should validate props according to provided schema', () => {
			const propsValidation = {
				required: T.string,
				optional: T.optional(T.number),
				count: T.number,
			}

			const validator = createBindingValidator('props', propsValidation)

			// Valid props
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'props',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {
						required: 'value',
						count: 42,
					},
					meta: {},
				})
			).not.toThrow()

			// With optional prop
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'props',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {
						required: 'value',
						optional: 123,
						count: 42,
					},
					meta: {},
				})
			).not.toThrow()

			// Missing required prop
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'props',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {
						count: 42,
					},
					meta: {},
				})
			).toThrow()

			// Wrong type for prop
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'props',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {
						required: 'value',
						count: 'not-a-number',
					},
					meta: {},
				})
			).toThrow()
		})

		it('should validate meta according to provided schema', () => {
			const metaValidation = {
				version: T.number,
				author: T.string,
				config: T.object({
					enabled: T.boolean,
					priority: T.literalEnum('low', 'medium', 'high'),
				}),
			}

			const validator = createBindingValidator('meta', undefined, metaValidation)

			// Valid meta
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'meta',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {
						version: 1,
						author: 'test-user',
						config: {
							enabled: true,
							priority: 'high',
						},
					},
				})
			).not.toThrow()

			// Invalid meta structure
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'meta',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {
						version: 'not-a-number',
						author: 'test-user',
						config: {
							enabled: true,
							priority: 'high',
						},
					},
				})
			).toThrow()

			// Invalid nested property
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'meta',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {
						version: 1,
						author: 'test-user',
						config: {
							enabled: true,
							priority: 'invalid-priority',
						},
					},
				})
			).toThrow()
		})

		test('should allow arbitrary props and meta when no validation provided', () => {
			const validator = createBindingValidator('flexible')

			const bindingWithArbitraryData = {
				id: 'binding:flexible123',
				typeName: 'binding',
				type: 'flexible',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: {
					customString: 'hello',
					customNumber: 42,
					customBoolean: true,
					customArray: [1, 2, 3],
					customObject: { nested: 'value' },
				},
				meta: {
					anything: 'goes',
					numbers: 123,
					arrays: ['a', 'b'],
					objects: { deep: { nesting: true } },
				},
			}

			expect(() => validator.validate(bindingWithArbitraryData)).not.toThrow()
			const result = validator.validate(bindingWithArbitraryData)
			expect(result).toEqual(bindingWithArbitraryData)
		})

		it('should handle complex validation scenarios', () => {
			const propsValidation = {
				coordinates: T.object({
					x: T.number,
					y: T.number,
					z: T.optional(T.number),
				}),
				tags: T.arrayOf(T.string),
				settings: T.object({
					enabled: T.boolean,
					mode: T.literalEnum('auto', 'manual', 'disabled'),
					thresholds: T.arrayOf(T.number),
				}),
			}

			const metaValidation = {
				created: T.number,
				lastModified: T.number,
				permissions: T.object({
					read: T.boolean,
					write: T.boolean,
					admin: T.optional(T.boolean),
				}),
			}

			const validator = createBindingValidator('complex', propsValidation, metaValidation)

			const complexBinding = {
				id: 'binding:complex123',
				typeName: 'binding',
				type: 'complex',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: {
					coordinates: { x: 100, y: 200, z: 50 },
					tags: ['important', 'geometry', 'test'],
					settings: {
						enabled: true,
						mode: 'auto',
						thresholds: [0.1, 0.5, 0.9],
					},
				},
				meta: {
					created: 1672531200000,
					lastModified: 1672617600000,
					permissions: {
						read: true,
						write: false,
						admin: true,
					},
				},
			}

			expect(() => validator.validate(complexBinding)).not.toThrow()
			const result = validator.validate(complexBinding)
			expect(result).toEqual(complexBinding)

			// Test with optional z coordinate missing
			const withoutZ = {
				...complexBinding,
				props: {
					...complexBinding.props,
					coordinates: { x: 100, y: 200 },
				},
			}
			expect(() => validator.validate(withoutZ)).not.toThrow()

			// Test with optional admin permission missing
			const withoutAdmin = {
				...complexBinding,
				meta: {
					...complexBinding.meta,
					permissions: {
						read: true,
						write: false,
					},
				},
			}
			expect(() => validator.validate(withoutAdmin)).not.toThrow()
		})

		it('should handle empty objects correctly', () => {
			const validator = createBindingValidator('empty')

			const emptyBinding = {
				id: 'binding:empty123',
				typeName: 'binding',
				type: 'empty',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: {},
				meta: {},
			}

			expect(() => validator.validate(emptyBinding)).not.toThrow()
			const result = validator.validate(emptyBinding)
			expect(result).toEqual(emptyBinding)
		})

		it('should reject missing required fields', () => {
			const validator = createBindingValidator('required')

			// Missing id
			expect(() =>
				validator.validate({
					typeName: 'binding',
					type: 'required',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {},
				} as any)
			).toThrow()

			// Missing typeName
			expect(() =>
				validator.validate({
					id: 'binding:test',
					type: 'required',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {},
				} as any)
			).toThrow()

			// Missing type
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {},
				} as any)
			).toThrow()

			// Missing fromId
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'required',
					toId: 'shape:to1',
					props: {},
					meta: {},
				} as any)
			).toThrow()

			// Missing toId
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'required',
					fromId: 'shape:from1',
					props: {},
					meta: {},
				} as any)
			).toThrow()

			// Missing props
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'required',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					meta: {},
				} as any)
			).toThrow()

			// Missing meta
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'required',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
				} as any)
			).toThrow()
		})
	})

	describe('integration with T.validator', () => {
		it('should work with isValid method', () => {
			const validator = createBindingValidator('integration', {
				value: T.string,
			})

			const validBinding = {
				id: 'binding:test',
				typeName: 'binding',
				type: 'integration',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: { value: 'test' },
				meta: {},
			}

			const invalidBinding = {
				id: 'binding:test',
				typeName: 'binding',
				type: 'integration',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: { value: 123 }, // Wrong type
				meta: {},
			}

			expect(validator.isValid(validBinding)).toBe(true)
			expect(validator.isValid(invalidBinding)).toBe(false)
		})

		it('should provide useful validation methods', () => {
			const validator = createBindingValidator('meta-test')

			// Validator provides the core validation functions
			expect(typeof validator.validate).toBe('function')
			expect(typeof validator.isValid).toBe('function')
		})

		it('should handle validator composition', () => {
			const baseValidator = createBindingValidator('chain', {
				name: T.string,
			})

			// Test that validators can be used for validation
			const validBinding = {
				id: 'binding:test',
				typeName: 'binding',
				type: 'chain',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: { name: 'test' },
				meta: {},
			}

			// This tests that the created validator works correctly
			expect(baseValidator).toBeDefined()
			expect(() => baseValidator.validate(validBinding)).not.toThrow()
			expect(baseValidator.isValid(validBinding)).toBe(true)
		})
	})
})
