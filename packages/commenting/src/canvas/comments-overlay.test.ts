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

	it('returns null for the open thread — the open-thread render slot draws it', () => {
		// Drawing it here too would mount its popover twice while the node fades out.
		expect(fadeNodeMarkerThreadId(node(['t1']), null, 't1')).toBeNull()
	})

	it('resolves a coincident stack to its owner', () => {
		expect(fadeNodeMarkerThreadId(node(['t1', 't2']), 't1', null)).toBe('t1')
		expect(fadeNodeMarkerThreadId(node(['t1', 't2']), 't1', 't2')).toBe('t1')
	})

	it('returns null for a stack whose owner is the open thread', () => {
		// Otherwise this node and the open slot would both draw the stack.
		expect(fadeNodeMarkerThreadId(node(['t1', 't2']), 't1', 't1')).toBeNull()
	})

	it('returns null for a stack whose owner is no longer a member', () => {
		expect(fadeNodeMarkerThreadId(node(['t2', 't3']), 't1', null)).toBeNull()
	})

	it('returns null for a stack with no owner', () => {
		expect(fadeNodeMarkerThreadId(node(['t1', 't2']), null, null)).toBeNull()
	})
})
