import { describe, expect, it } from 'vitest'
import { planRestoreComments } from './restorePlan'

const rec = (id: string, extra: object = {}) => ({ id, typeName: 'x', ...extra }) as any

describe('planRestoreComments', () => {
	it('normal restore tombstones all live comment records', () => {
		const live = [rec('commentThread:a'), rec('comment:b')]
		expect(planRestoreComments({ liveCommentRecords: live, undoTombstones: null })).toEqual({
			toTombstone: live,
			toReinsert: [],
			outboxIds: ['commentThread:a', 'comment:b'],
		})
	})

	it('undo reinserts tombstones and keeps live records', () => {
		const plan = planRestoreComments({
			liveCommentRecords: [rec('comment:new')],
			undoTombstones: [rec('commentThread:a')],
		})
		expect(plan.toTombstone).toEqual([])
		expect(plan.toReinsert.map((r) => r.id).sort()).toEqual(['comment:new', 'commentThread:a'])
	})

	it('undo prefers tombstoned copy for same id', () => {
		const plan = planRestoreComments({
			liveCommentRecords: [rec('comment:b', { v: 'live' })],
			undoTombstones: [rec('comment:b', { v: 'tomb' })],
		})
		expect(plan.toReinsert).toEqual([rec('comment:b', { v: 'tomb' })])
	})

	it('outbox ids cover tombstoned and reinserted', () => {
		const plan = planRestoreComments({
			liveCommentRecords: [rec('comment:new')],
			undoTombstones: [rec('commentThread:a')],
		})
		expect(plan.outboxIds.sort()).toEqual(['comment:new', 'commentThread:a'])
	})
})
