import { describe, expect, it } from 'vitest'
import type { ClusterNode } from '../clustering/types'
import { fadeNodeMarkerThreadId } from './comments-overlay'

function node(ids: string[], x = 0, y = 0): ClusterNode {
	const members = ids.slice().sort()
	return {
		id: members.length === 1 ? members[0] : `cluster:${members.length}:${members[0]}`,
		centroid: { x, y },
		count: members.length,
		members,
	}
}

describe('fadeNodeMarkerThreadId', () => {
	it('resolves a count-1 node to its own thread', () => {
		expect(fadeNodeMarkerThreadId(node(['t1']), null, null)).toBe('t1')
		expect(fadeNodeMarkerThreadId(node(['t1']), null, 't2')).toBe('t1')
	})

	it('never resolves to the open thread — its dedicated slot renders it', () => {
		// The open thread's node lingers as a stale/exiting fade entry during the open transition;
		// rendering its pin here would mount a second popover stacked over the real one.
		expect(fadeNodeMarkerThreadId(node(['t1']), null, 't1')).toBeNull()
	})

	it('resolves a coincident stack to its owner', () => {
		expect(fadeNodeMarkerThreadId(node(['t1', 't2']), 't1', null)).toBe('t1')
		expect(fadeNodeMarkerThreadId(node(['t1', 't2']), 't1', 't2')).toBe('t1')
	})

	it('yields a stack whose owner is the open thread', () => {
		// Mid-transition the node's members still include the open thread, so the owner scan can
		// land on it; without the guard both this node and the open slot would draw the stack.
		expect(fadeNodeMarkerThreadId(node(['t1', 't2']), 't1', 't1')).toBeNull()
	})

	it('yields a stack whose owner is no longer a member', () => {
		// Post-detach the open thread has left the members list; the open slot owns the stack.
		expect(fadeNodeMarkerThreadId(node(['t2', 't3']), 't1', null)).toBeNull()
	})

	it('yields a stack with no owner', () => {
		expect(fadeNodeMarkerThreadId(node(['t1', 't2']), null, null)).toBeNull()
	})
})
