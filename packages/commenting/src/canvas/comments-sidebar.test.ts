import { describe, expect, it } from 'vitest'
import type { CommentListItemProps } from '../ui/comments-list'
import { sortSidebarRows } from './comments-sidebar'

function row(id: string, lastActivity: number, resolved = false) {
	return {
		item: {
			id,
			resolved,
			author: { id: 'user:1', name: 'A' },
			preview: '',
			date: '',
		} as unknown as CommentListItemProps,
		lastActivity,
	}
}

describe('sortSidebarRows', () => {
	it('orders threads by their most recent comment, not their first', () => {
		// t1 was started first but was just replied to; t2 has been quiet since it was created.
		const sorted = sortSidebarRows([row('t1', 300), row('t2', 200)])
		expect(sorted.map((r) => r.item.id)).toEqual(['t1', 't2'])
	})

	it('sinks resolved threads below unresolved ones however recent they are', () => {
		const sorted = sortSidebarRows([row('t1', 100), row('t2', 999, true), row('t3', 200)])
		expect(sorted.map((r) => r.item.id)).toEqual(['t3', 't1', 't2'])
	})

	it('orders resolved threads among themselves by recency too', () => {
		const sorted = sortSidebarRows([row('t1', 100, true), row('t2', 300, true)])
		expect(sorted.map((r) => r.item.id)).toEqual(['t2', 't1'])
	})

	it('breaks activity ties by id so the list does not reshuffle', () => {
		const sorted = sortSidebarRows([row('t3', 5), row('t1', 5), row('t2', 5)])
		expect(sorted.map((r) => r.item.id)).toEqual(['t1', 't2', 't3'])
	})

	it('does not mutate the input', () => {
		const input = [row('t1', 100), row('t2', 200)]
		sortSidebarRows(input)
		expect(input.map((r) => r.item.id)).toEqual(['t1', 't2'])
	})
})
