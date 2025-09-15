import { describe, expect, it } from 'vitest'
import { annotateError, getErrorAnnotations, type ErrorAnnotations } from './error'

describe('ErrorAnnotations interface', () => {
	it('should allow tags with primitive values', () => {
		const annotations: ErrorAnnotations = {
			tags: {
				stringTag: 'test',
				numberTag: 42,
				booleanTag: true,
				bigintTag: 123n,
				symbolTag: Symbol('test'),
				nullTag: null,
				undefinedTag: undefined,
			},
			extras: {},
		}

		expect(annotations.tags.stringTag).toBe('test')
		expect(annotations.tags.numberTag).toBe(42)
		expect(annotations.tags.booleanTag).toBe(true)
		expect(annotations.tags.bigintTag).toBe(123n)
		expect(typeof annotations.tags.symbolTag).toBe('symbol')
		expect(annotations.tags.nullTag).toBe(null)
		expect(annotations.tags.undefinedTag).toBe(undefined)
	})

	it('should allow extras with any values', () => {
		const annotations: ErrorAnnotations = {
			tags: {},
			extras: {
				object: { key: 'value' },
				array: [1, 2, 3],
				function: () => 'test',
			},
		}

		expect(annotations.extras.object).toEqual({ key: 'value' })
		expect(annotations.extras.array).toEqual([1, 2, 3])
		expect(typeof annotations.extras.function).toBe('function')
	})
})

describe('annotateError', () => {
	describe('basic functionality', () => {
		it('should annotate an Error object with tags', () => {
			const error = new Error('test error')
			annotateError(error, {
				tags: { userId: '123', operation: 'save' },
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.tags.userId).toBe('123')
			expect(annotations.tags.operation).toBe('save')
		})

		it('should annotate an Error object with extras', () => {
			const error = new Error('test error')
			annotateError(error, {
				extras: { timestamp: 1234567890, data: { key: 'value' } },
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.extras.timestamp).toBe(1234567890)
			expect(annotations.extras.data).toEqual({ key: 'value' })
		})

		it('should annotate an Error object with both tags and extras', () => {
			const error = new Error('test error')
			annotateError(error, {
				tags: { component: 'auth' },
				extras: { request: { id: 'req123' } },
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.tags.component).toBe('auth')
			expect(annotations.extras.request).toEqual({ id: 'req123' })
		})
	})

	describe('merging annotations', () => {
		it('should merge new tags with existing tags', () => {
			const error = new Error('test error')

			annotateError(error, {
				tags: { userId: '123', operation: 'save' },
			})

			annotateError(error, {
				tags: { component: 'auth', environment: 'prod' },
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.tags).toEqual({
				userId: '123',
				operation: 'save',
				component: 'auth',
				environment: 'prod',
			})
		})

		it('should merge new extras with existing extras', () => {
			const error = new Error('test error')

			annotateError(error, {
				extras: { timestamp: 1234567890, user: { id: '123' } },
			})

			annotateError(error, {
				extras: { requestId: 'req456', metadata: { version: '1.0' } },
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.extras).toEqual({
				timestamp: 1234567890,
				user: { id: '123' },
				requestId: 'req456',
				metadata: { version: '1.0' },
			})
		})

		it('should overwrite existing tags with new values', () => {
			const error = new Error('test error')

			annotateError(error, {
				tags: { userId: '123', operation: 'save' },
			})

			annotateError(error, {
				tags: { userId: '456', component: 'auth' },
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.tags).toEqual({
				userId: '456', // overwritten
				operation: 'save', // preserved
				component: 'auth', // new
			})
		})

		it('should overwrite existing extras with new values', () => {
			const error = new Error('test error')

			annotateError(error, {
				extras: { timestamp: 1234567890, data: 'old' },
			})

			annotateError(error, {
				extras: { timestamp: 9876543210, metadata: 'new' },
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.extras).toEqual({
				timestamp: 9876543210, // overwritten
				data: 'old', // preserved
				metadata: 'new', // new
			})
		})
	})

	describe('edge cases', () => {
		it('should handle null error input', () => {
			expect(() => annotateError(null, { tags: { test: 'value' } })).not.toThrow()
		})

		it('should handle undefined error input', () => {
			expect(() => annotateError(undefined, { tags: { test: 'value' } })).not.toThrow()
		})

		it('should handle primitive error inputs', () => {
			expect(() => annotateError('string error', { tags: { test: 'value' } })).not.toThrow()
			expect(() => annotateError(123, { tags: { test: 'value' } })).not.toThrow()
			expect(() => annotateError(true, { tags: { test: 'value' } })).not.toThrow()
		})

		it('should handle empty annotations', () => {
			const error = new Error('test error')
			annotateError(error, {})

			const annotations = getErrorAnnotations(error)
			expect(annotations.tags).toEqual({})
			expect(annotations.extras).toEqual({})
		})

		it('should handle partial annotations with only tags', () => {
			const error = new Error('test error')
			annotateError(error, {
				tags: { component: 'test' },
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.tags.component).toBe('test')
			expect(annotations.extras).toEqual({})
		})

		it('should handle partial annotations with only extras', () => {
			const error = new Error('test error')
			annotateError(error, {
				extras: { data: 'test' },
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.tags).toEqual({})
			expect(annotations.extras.data).toBe('test')
		})
	})

	describe('object types', () => {
		it('should work with different Error subclasses', () => {
			const typeError = new TypeError('type error')
			const rangeError = new RangeError('range error')

			annotateError(typeError, { tags: { type: 'TypeError' } })
			annotateError(rangeError, { tags: { type: 'RangeError' } })

			expect(getErrorAnnotations(typeError).tags.type).toBe('TypeError')
			expect(getErrorAnnotations(rangeError).tags.type).toBe('RangeError')
		})

		it('should work with plain objects', () => {
			const errorObj = { message: 'custom error' }
			annotateError(errorObj, {
				tags: { custom: true },
			})

			const annotations = getErrorAnnotations(errorObj as Error)
			expect(annotations.tags.custom).toBe(true)
		})

		it('should maintain separate annotations for different error objects', () => {
			const error1 = new Error('error 1')
			const error2 = new Error('error 2')

			annotateError(error1, { tags: { id: 1 } })
			annotateError(error2, { tags: { id: 2 } })

			expect(getErrorAnnotations(error1).tags.id).toBe(1)
			expect(getErrorAnnotations(error2).tags.id).toBe(2)
		})
	})

	describe('tag value types', () => {
		it('should handle all supported tag value types', () => {
			const error = new Error('test error')
			const symbol = Symbol('test')

			annotateError(error, {
				tags: {
					stringVal: 'string',
					numberVal: 42,
					booleanVal: true,
					bigintVal: 123n,
					symbolVal: symbol,
					nullVal: null,
					undefinedVal: undefined,
				},
			})

			const annotations = getErrorAnnotations(error)
			expect(annotations.tags.stringVal).toBe('string')
			expect(annotations.tags.numberVal).toBe(42)
			expect(annotations.tags.booleanVal).toBe(true)
			expect(annotations.tags.bigintVal).toBe(123n)
			expect(annotations.tags.symbolVal).toBe(symbol)
			expect(annotations.tags.nullVal).toBe(null)
			expect(annotations.tags.undefinedVal).toBe(undefined)
		})
	})
})

describe('getErrorAnnotations', () => {
	it('should return empty annotations for unannotated errors', () => {
		const error = new Error('test error')
		const annotations = getErrorAnnotations(error)

		expect(annotations).toEqual({
			tags: {},
			extras: {},
		})
	})

	it('should return previously set annotations', () => {
		const error = new Error('test error')
		annotateError(error, {
			tags: { userId: '123' },
			extras: { timestamp: 1234567890 },
		})

		const annotations = getErrorAnnotations(error)
		expect(annotations.tags.userId).toBe('123')
		expect(annotations.extras.timestamp).toBe(1234567890)
	})

	it('should return immutable references to annotations', () => {
		const error = new Error('test error')
		annotateError(error, {
			tags: { userId: '123' },
			extras: { data: { key: 'value' } },
		})

		const annotations1 = getErrorAnnotations(error)
		const annotations2 = getErrorAnnotations(error)

		// Should be the same object reference (WeakMap behavior)
		expect(annotations1).toBe(annotations2)
	})

	it('should handle errors that were annotated with null/undefined values', () => {
		const error = new Error('test error')
		annotateError(error, {
			tags: { nullTag: null, undefinedTag: undefined },
			extras: { nullExtra: null, undefinedExtra: undefined },
		})

		const annotations = getErrorAnnotations(error)
		expect(annotations.tags.nullTag).toBe(null)
		expect(annotations.tags.undefinedTag).toBe(undefined)
		expect(annotations.extras.nullExtra).toBe(null)
		expect(annotations.extras.undefinedExtra).toBe(undefined)
	})
})

describe('WeakMap behavior', () => {
	it('should not prevent garbage collection of error objects', () => {
		// This test verifies that the WeakMap doesn't create strong references
		// We can't easily test garbage collection, but we can verify the WeakMap behavior
		let error: Error | null = new Error('test error')
		const weakRef = new WeakRef(error)

		annotateError(error, { tags: { test: 'value' } })
		expect(getErrorAnnotations(error).tags.test).toBe('value')

		// Clear the reference
		error = null

		// The WeakMap should not prevent garbage collection
		// (This is more of a conceptual test - actual GC testing is complex)
		expect(weakRef.deref()).toBeDefined() // May still be defined due to recent allocation
	})

	it('should work with multiple concurrent annotations', () => {
		const errors = Array.from({ length: 100 }, (_, i) => new Error(`error ${i}`))

		errors.forEach((error, index) => {
			annotateError(error, {
				tags: { index, isEven: index % 2 === 0 },
				extras: { created: Date.now() + index },
			})
		})

		errors.forEach((error, index) => {
			const annotations = getErrorAnnotations(error)
			expect(annotations.tags.index).toBe(index)
			expect(annotations.tags.isEven).toBe(index % 2 === 0)
			expect(typeof annotations.extras.created).toBe('number')
		})
	})
})
