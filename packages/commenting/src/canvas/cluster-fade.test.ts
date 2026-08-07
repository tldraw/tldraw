import { describe, expect, it } from 'vitest'
import type { ClusterNode } from '../clustering/types'
import { type ClusterFadeNode, reconcileFadeNodes } from './cluster-fade'

function node(id: string): ClusterNode {
	return { id, centroid: { x: 0, y: 0 }, count: 1, members: [id] }
}

describe('reconcileFadeNodes exit deadlines', () => {
	it('stamps a departing node with its own exit deadline', () => {
		const present: ClusterFadeNode[] = [{ node: node('a'), phase: 'present' }]
		expect(reconcileFadeNodes(present, [], 1000)).toEqual([
			{ node: node('a'), phase: 'exiting', exitAt: 1150 },
		])
	})

	it('keeps the original deadline on later reconciles — unrelated churn cannot extend the fade', () => {
		const exiting: ClusterFadeNode[] = [{ node: node('a'), phase: 'exiting', exitAt: 1150 }]
		// A much later reconcile, with an unrelated node entering, must not re-stamp `a`.
		const next = reconcileFadeNodes(exiting, [node('b')], 5000)
		expect(next.find((i) => i.node.id === 'a')).toEqual({
			node: node('a'),
			phase: 'exiting',
			exitAt: 1150,
		})
	})

	it('clears the deadline when an exiting node reappears', () => {
		const exiting: ClusterFadeNode[] = [{ node: node('a'), phase: 'exiting', exitAt: 1150 }]
		expect(reconcileFadeNodes(exiting, [node('a')], 2000)).toEqual([
			{ node: node('a'), phase: 'present' },
		])
	})

	it('gives each node its own deadline as they depart at different times', () => {
		const both: ClusterFadeNode[] = [
			{ node: node('a'), phase: 'present' },
			{ node: node('b'), phase: 'present' },
		]
		const afterAleft = reconcileFadeNodes(both, [node('b')], 1000)
		expect(afterAleft.find((i) => i.node.id === 'a')?.exitAt).toBe(1150)

		const afterBleft = reconcileFadeNodes(afterAleft, [], 1100)
		expect(afterBleft.find((i) => i.node.id === 'a')?.exitAt).toBe(1150) // unchanged
		expect(afterBleft.find((i) => i.node.id === 'b')?.exitAt).toBe(1250) // its own deadline
	})
})
