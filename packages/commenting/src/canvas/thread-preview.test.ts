import type { TLComment, TLCommentThread } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { selectPreviewCards, sortThreadsForPreview } from './thread-preview'

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

function comment(threadId: string): TLComment {
	return { id: `comment:${threadId}`, typeName: 'comment', threadId } as unknown as TLComment
}

/** Stands in for the store lookup: only the named threads have their opening comment yet. */
function arrived(...threadIds: string[]) {
	return (t: TLCommentThread) => (threadIds.includes(t.id) ? comment(t.id) : undefined)
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

describe('selectPreviewCards', () => {
	it('pairs each thread with its opening comment', () => {
		const threads = [thread('t1', 10), thread('t2', 20)]
		const { cards, overflow } = selectPreviewCards(threads, arrived('t1', 't2'))
		expect(cards.map((c) => [c.thread.id, c.first.id])).toEqual([
			['t1', 'comment:t1'],
			['t2', 'comment:t2'],
		])
		expect(overflow).toBe(0)
	})

	// A thread record can sync ahead of its first comment. It has nothing to show, and rendering it
	// anyway would paint a blank card — or, for a single-pin preview, a blank panel.
	it('drops threads whose opening comment has not arrived', () => {
		const threads = [thread('t1', 10), thread('t2', 20), thread('t3', 30)]
		const { cards } = selectPreviewCards(threads, arrived('t1', 't3'))
		expect(cards.map((c) => c.thread.id)).toEqual(['t1', 't3'])
	})

	it('reports nothing to show when no comment has arrived', () => {
		const { cards, overflow } = selectPreviewCards([thread('t1', 10)], arrived())
		expect(cards).toEqual([])
		expect(overflow).toBe(0)
	})

	it('caps the cards and counts the rest as overflow', () => {
		const threads = ['t1', 't2', 't3', 't4'].map((id, i) => thread(id, i))
		const { cards, overflow } = selectPreviewCards(threads, arrived('t1', 't2', 't3', 't4'), 2)
		expect(cards.map((c) => c.thread.id)).toEqual(['t1', 't2'])
		expect(overflow).toBe(2)
	})

	// "+N more" should promise N readable threads, so unarrived ones can't pad the count.
	it('excludes unarrived threads from the overflow tally', () => {
		const threads = ['t1', 't2', 't3', 't4'].map((id, i) => thread(id, i))
		const { cards, overflow } = selectPreviewCards(threads, arrived('t1', 't2', 't3'), 2)
		expect(cards.map((c) => c.thread.id)).toEqual(['t1', 't2'])
		expect(overflow).toBe(1)
	})
})
