import { describe, expect, it } from 'vitest'
import { annotateError, getErrorAnnotations } from './error'

describe('annotateError', () => {
	it('should annotate an Error object with tags and extras', () => {
		const error = new Error('test error')
		annotateError(error, {
			tags: { userId: '123', operation: 'save' },
			extras: { timestamp: 1234567890, data: { key: 'value' } },
		})

		const annotations = getErrorAnnotations(error)
		expect(annotations.tags.userId).toBe('123')
		expect(annotations.tags.operation).toBe('save')
		expect(annotations.extras.timestamp).toBe(1234567890)
		expect(annotations.extras.data).toEqual({ key: 'value' })
	})

	it('should merge annotations from multiple calls', () => {
		const error = new Error('test error')

		annotateError(error, {
			tags: { userId: '123', operation: 'save' },
			extras: { timestamp: 1234567890 },
		})

		annotateError(error, {
			tags: { userId: '456', component: 'auth' }, // userId should be overwritten
			extras: { requestId: 'req456' },
		})

		const annotations = getErrorAnnotations(error)
		expect(annotations.tags).toEqual({
			userId: '456', // overwritten
			operation: 'save', // preserved
			component: 'auth', // new
		})
		expect(annotations.extras).toEqual({
			timestamp: 1234567890, // preserved
			requestId: 'req456', // new
		})
	})

	it('should handle non-object inputs gracefully', () => {
		expect(() => annotateError(null, { tags: { test: 'value' } })).not.toThrow()
		expect(() => annotateError('string error', { tags: { test: 'value' } })).not.toThrow()
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
})
