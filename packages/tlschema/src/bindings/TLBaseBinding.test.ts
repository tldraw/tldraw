import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { bindingIdValidator, createBindingValidator } from './TLBaseBinding'

describe('TLBaseBinding', () => {
	describe('bindingIdValidator', () => {
		it('should validate correct binding IDs', () => {
			expect(bindingIdValidator.isValid('binding:abc123')).toBe(true)
			expect(() => bindingIdValidator.validate('binding:abc123')).not.toThrow()
		})

		it('should reject invalid binding IDs', () => {
			expect(bindingIdValidator.isValid('shape:abc123')).toBe(false)
			expect(() => bindingIdValidator.validate('shape:abc123')).toThrow()
			expect(() => bindingIdValidator.validate('binding')).toThrow()
		})
	})

	describe('createBindingValidator', () => {
		it('should create validator for binding with custom props validation', () => {
			const propsValidation = {
				name: T.string,
				count: T.number,
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
				},
				meta: {},
			}

			expect(() => validator.validate(validBinding)).not.toThrow()

			// Should reject invalid props
			expect(() => validator.validate({ ...validBinding, props: { name: 123 } })).toThrow()
		})

		it('should validate base binding properties', () => {
			const validator = createBindingValidator('test')

			// Test invalid binding id
			expect(() =>
				validator.validate({
					id: 'shape:invalid',
					typeName: 'binding',
					type: 'test',
					fromId: 'shape:from1',
					toId: 'shape:to1',
					props: {},
					meta: {},
				})
			).toThrow()

			// Test invalid shape id
			expect(() =>
				validator.validate({
					id: 'binding:test',
					typeName: 'binding',
					type: 'test',
					fromId: 'invalid:from1',
					toId: 'shape:to1',
					props: {},
					meta: {},
				})
			).toThrow()
		})

		it('should validate props according to provided schema', () => {
			const propsValidation = {
				required: T.string,
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
					props: { required: 'value', count: 42 },
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
					props: { count: 42 },
					meta: {},
				})
			).toThrow()
		})

		it('should allow arbitrary props and meta when no validation provided', () => {
			const validator = createBindingValidator('flexible')

			const bindingWithArbitraryData = {
				id: 'binding:flexible123',
				typeName: 'binding',
				type: 'flexible',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: { customString: 'hello', customArray: [1, 2, 3] },
				meta: { anything: 'goes' },
			}

			expect(() => validator.validate(bindingWithArbitraryData)).not.toThrow()
		})
	})
})
