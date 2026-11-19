import { describe, expect, it } from 'vitest'
import { countShapeChanges } from './versionChangeCounts'

describe('countShapeChanges', () => {
	it('counts put/patch/remove for shapes only', () => {
		expect(
			countShapeChanges({
				'shape:a': ['put', { id: 'shape:a', typeName: 'shape' }],
				'shape:b': ['put', { id: 'shape:b', typeName: 'shape' }],
				'shape:c': ['patch', { x: ['put', 1] }],
				'shape:d': ['remove'],
				'page:p': ['put', { id: 'page:p', typeName: 'page' }],
			} as any)
		).toEqual({ added: 2, updated: 1, removed: 1 })
	})

	it('null diff counts zero', () => {
		expect(countShapeChanges(null)).toEqual({ added: 0, updated: 0, removed: 0 })
	})
})
