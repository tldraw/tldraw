import { describe, expect, it } from 'vitest'
import { stripCommentRecords } from './previewSnapshot'

describe('stripCommentRecords', () => {
	it('drops comment records the preview store has no schema for', () => {
		const snapshot = {
			schema: { v: 1 },
			store: {
				'shape:a': { id: 'shape:a', typeName: 'shape' },
				'comment-thread:t': { id: 'comment-thread:t', typeName: 'comment-thread' },
				'comment:c': { id: 'comment:c', typeName: 'comment' },
				'comment-reaction:r': { id: 'comment-reaction:r', typeName: 'comment-reaction' },
			},
		} as any
		expect(Object.keys(stripCommentRecords(snapshot).store)).toEqual(['shape:a'])
	})
})
