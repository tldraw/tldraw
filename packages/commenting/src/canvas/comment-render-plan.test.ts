import { describe, expect, it } from 'vitest'
import type { ClusterNode } from '../clustering/types'
import type { ClusterFadePhase } from './cluster-fade'
import {
	type CommentBaseCandidate,
	pureStackGroup,
	resolveCommentRenderPlan,
} from './comment-render-plan'

function node(ids: string[], phase: ClusterFadePhase = 'present'): CommentBaseCandidate {
	const members = ids.slice().sort()
	const clusterNode: ClusterNode = {
		id: members.length === 1 ? members[0] : `cluster:${members.length}:${members[0]}`,
		centroid: { x: 0, y: 0 },
		count: members.length,
		members,
	}
	return { kind: 'node', node: clusterNode, phase }
}

function thread(threadId: string): CommentBaseCandidate {
	return { kind: 'thread', threadId }
}

function stacks(...groups: string[][]): Map<string, readonly string[]> {
	const map = new Map<string, readonly string[]>()
	for (const group of groups) for (const id of group) map.set(id, group)
	return map
}

const NONE = { openThreadId: null, heldThreadIds: [], orphanThreadIds: [], pinStacks: new Map() }

describe('resolveCommentRenderPlan', () => {
	it('draws the open thread once, even while its old cluster node lingers for the exit fade', () => {
		// The bug #9886 guarded against: opening a thread pulls its leaf from the cluster, so the old
		// node hangs around exiting while the open slot mounts the thread fresh — two popovers, doubled
		// shadow. Here the open slot claims `t1` first, so the exit-fade node claims nothing.
		const plan = resolveCommentRenderPlan({
			...NONE,
			openThreadId: 't1',
			base: [node(['t1'], 'exiting')],
		})
		expect(plan).toEqual([{ key: 'pin:t1', phase: null, unit: { kind: 'pin', threadId: 't1' } }])
	})

	it('draws a coincident stack once even when several of its members linger as fade nodes', () => {
		const plan = resolveCommentRenderPlan({
			...NONE,
			pinStacks: stacks(['t1', 't2']),
			base: [node(['t1'], 'exiting'), node(['t2'], 'exiting')],
		})
		expect(plan).toEqual([
			{ key: 'stack:t1|t2', phase: 'exiting', unit: { kind: 'stack', group: ['t1', 't2'] } },
		])
	})

	it('lets the open slot own a stack the open thread belongs to, drawn plain', () => {
		const plan = resolveCommentRenderPlan({
			...NONE,
			openThreadId: 't1',
			pinStacks: stacks(['t1', 't2']),
			base: [node(['t1', 't2'], 'exiting')],
		})
		expect(plan).toEqual([
			{ key: 'stack:t1|t2', phase: null, unit: { kind: 'stack', group: ['t1', 't2'] } },
		])
	})

	it('draws a merged cluster as a badge', () => {
		const plan = resolveCommentRenderPlan({
			...NONE,
			base: [node(['a', 'b', 'c'], 'entering')],
		})
		expect(plan).toEqual([
			{
				key: 'badge:cluster:3:a',
				phase: 'entering',
				unit: { kind: 'badge', node: expect.objectContaining({ count: 3 }) },
			},
		])
	})

	it('resolves held and orphan slots ahead of the base layer', () => {
		const plan = resolveCommentRenderPlan({
			...NONE,
			heldThreadIds: ['t1'],
			orphanThreadIds: ['t2'],
			base: [node(['t1'], 'exiting'), node(['t2'], 'exiting'), node(['t3'], 'present')],
		})
		expect(plan).toEqual([
			{ key: 'pin:t1', phase: null, unit: { kind: 'pin', threadId: 't1' } },
			{ key: 'pin:t2', phase: null, unit: { kind: 'pin', threadId: 't2' } },
			{ key: 'pin:t3', phase: 'present', unit: { kind: 'pin', threadId: 't3' } },
		])
	})

	it('never doubles the open thread with clustering off', () => {
		const plan = resolveCommentRenderPlan({
			...NONE,
			openThreadId: 't1',
			base: [thread('t1'), thread('t2'), thread('t3')],
		})
		expect(plan.map((e) => e.key)).toEqual(['pin:t1', 'pin:t2', 'pin:t3'])
		expect(plan.filter((e) => e.key === 'pin:t1')).toHaveLength(1)
	})

	it('every plan key is unique — the invariant that makes double renders impossible', () => {
		const plan = resolveCommentRenderPlan({
			openThreadId: 't1',
			heldThreadIds: ['t4'],
			orphanThreadIds: ['t5'],
			pinStacks: stacks(['t1', 't2']),
			base: [
				node(['t1'], 'exiting'),
				node(['t2'], 'exiting'),
				node(['t3'], 'present'),
				node(['a', 'b'], 'present'),
			],
		})
		const keys = plan.map((e) => e.key)
		expect(new Set(keys).size).toBe(keys.length)
	})
})

describe('pureStackGroup', () => {
	it('returns the group when the node sits entirely inside one stack', () => {
		const { node: clusterNode } = node(['t1', 't2']) as { node: ClusterNode }
		expect(pureStackGroup(clusterNode, stacks(['t1', 't2']))).toEqual(['t1', 't2'])
	})

	it('returns null when the members do not all share a stack', () => {
		const { node: clusterNode } = node(['t1', 't2']) as { node: ClusterNode }
		expect(pureStackGroup(clusterNode, stacks(['t1', 'tX']))).toBeNull()
	})
})
