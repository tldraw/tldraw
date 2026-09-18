import type { TLCommentThread } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { sortThreadsForPreview } from './thread-preview'

function thread(id: string, createdAt: number): TLCommentThread {
	return {
		id,
		typeName: 'comment-thread',
		pageId: 'page:one',
		anchor: { type: 'point', x: 0, y: 0 },
		createdBy: 'user:1',
		createdAt,
		resolved: null,
		meta: {},
	} as unknown as TLCommentThread
}

describe('sortThreadsForPreview', () => {
	it('orders threads oldest first', () => {
		const sorted = sortThreadsForPreview([thread('t2', 20), thread('t1', 10), thread('t3', 30)])
		expect(sorted.map((t) => t.id)).toEqual(['t1', 't2', 't3'])
	})

	it('breaks creation-time ties by id, matching the stack ordering', () => {
		const sorted = sortThreadsForPreview([thread('t3', 5), thread('t1', 5), thread('t2', 5)])
		expect(sorted.map((t) => t.id)).toEqual(['t1', 't2', 't3'])
	})

	// A cluster hands over `node.members`, which the clustering table sorts by id — the preview has
	// to re-sort rather than inherit that order, or a cluster would read newest-first at random.
	it('reorders an id-sorted cluster membership by creation time', () => {
		const sorted = sortThreadsForPreview([thread('t1', 300), thread('t2', 200), thread('t3', 100)])
		expect(sorted.map((t) => t.id)).toEqual(['t3', 't2', 't1'])
	})

	it('does not mutate the input', () => {
		const input = [thread('t2', 20), thread('t1', 10)]
		sortThreadsForPreview(input)
		expect(input.map((t) => t.id)).toEqual(['t2', 't1'])
	})
})
