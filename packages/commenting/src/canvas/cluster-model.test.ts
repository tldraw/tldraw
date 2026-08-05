import { describe, expect, it } from 'vitest'
import { createClusterRuntime } from '../clustering/runtime'
import type { ClusterNode, ClusterTable, LeafInput } from '../clustering/types'
import type { ClusterInput } from './cluster-input'
import { anyFoldedLeafMoved, type ClusterModel } from './cluster-model'

function node(ids: string[], x = 0, y = 0): ClusterNode {
	const members = ids.slice().sort()
	return {
		id: members.length === 1 ? members[0] : `cluster:${members.length}:${members[0]}`,
		centroid: { x, y },
		count: members.length,
		members,
	}
}

/** t1 and t2 fold into one badge below zoom 1; t3 sits far away and never merges. */
const TABLE: ClusterTable = {
	leaves: [node(['t1'], 0, 0), node(['t2'], 10, 0), node(['t3'], 5000, 0)],
	events: [
		{
			zMerge: 1,
			zSplit: 2,
			children: [node(['t1']), node(['t2'])],
			result: node(['t1', 't2'], 5, 0),
		},
	],
}

/** The rendered partition at `zoom`: below 1 the badge is up, above 2 every pin stands alone. */
function rendered(zoom: number): ClusterModel {
	const runtime = createClusterRuntime(TABLE)
	runtime.seed(zoom)
	return { runtime, table: TABLE }
}

const leaf = (id: string, x: number, y: number): LeafInput => ({ id, point: { x, y } })
const input = (leaves: LeafInput[]): ClusterInput => ({ leaves, screenOffsets: undefined })

const AT_REST = [leaf('t1', 0, 0), leaf('t2', 10, 0), leaf('t3', 5000, 0)]

describe('anyFoldedLeafMoved', () => {
	it('breaks the freeze when a leaf folded into a badge moves', () => {
		const model = rendered(0.5)
		expect([...model.runtime.getVisible().keys()].sort()).toEqual(['cluster:2:t1', 't3'])
		const next = input([leaf('t1', 40, 0), leaf('t2', 10, 0), leaf('t3', 5000, 0)])
		expect(anyFoldedLeafMoved(input(AT_REST), next, model)).toBe(true)
	})

	it('holds the freeze when a visible leaf moves — its pin already rides its anchor', () => {
		const next = input([leaf('t1', 0, 0), leaf('t2', 10, 0), leaf('t3', 5040, 0)])
		expect(anyFoldedLeafMoved(input(AT_REST), next, rendered(0.5))).toBe(false)
		// and with the badge split, the same move of a former badge member is visible too
		const split = input([leaf('t1', 40, 0), leaf('t2', 10, 0), leaf('t3', 5000, 0)])
		expect(anyFoldedLeafMoved(input(AT_REST), split, rendered(3))).toBe(false)
	})

	it('holds the freeze when an orphan moves — it is not in the rendered partition to pop out of', () => {
		// t4 was added since the last adopted rebuild: it is in the input but not in the rendered
		// table, so it renders as a plain live pin and no pop-out can ever hold it. Counting it as
		// folded would rebuild on every pointermove for the rest of the drag.
		const atRest = [...AT_REST, leaf('t4', 20, 0)]
		const next = input([...AT_REST, leaf('t4', 60, 0)])
		expect(anyFoldedLeafMoved(input(atRest), next, rendered(0.5))).toBe(false)
	})

	it('holds the freeze when a detached leaf moves — it left the badge already', () => {
		const model = rendered(0.5)
		model.runtime.detachLeaves(['t1'])
		expect(
			anyFoldedLeafMoved(input(AT_REST), input([leaf('t1', 40, 0), ...AT_REST.slice(1)]), model)
		).toBe(false)
	})

	it('holds the freeze when nothing moved', () => {
		expect(anyFoldedLeafMoved(input(AT_REST), input([...AT_REST]), rendered(0.5))).toBe(false)
	})

	it('holds the freeze with no rendered model yet', () => {
		const next = input([leaf('t1', 40, 0), leaf('t2', 10, 0), leaf('t3', 5000, 0)])
		expect(anyFoldedLeafMoved(input(AT_REST), next, null)).toBe(false)
	})

	it('holds the freeze on mismatched inputs rather than reading past the end', () => {
		const next = input([leaf('t1', 40, 0), leaf('t2', 10, 0)])
		expect(anyFoldedLeafMoved(input(AT_REST), next, rendered(0.5))).toBe(false)
	})
})
