import type { ClusterNode } from '../clustering/types'
import type { ClusterFadePhase } from './cluster-fade'

/**
 * One thing the overlay draws: a lone thread pin, one coincident-stack badge (drawn once for the
 * whole group), or a merged cluster badge. The plan resolver claims each of these exactly once, so
 * nothing the overlay renders can be drawn twice.
 * @internal
 */
export type CommentRenderUnit =
	| { readonly kind: 'pin'; readonly threadId: string }
	| { readonly kind: 'stack'; readonly group: readonly string[] }
	| { readonly kind: 'badge'; readonly node: ClusterNode }

/**
 * A resolved draw instruction: which unit to render, its fade phase (`null` = drawn plain, outside
 * the fade layer, at full opacity), and a key unique within the plan.
 * @internal
 */
export interface CommentRenderEntry {
	readonly key: string
	readonly phase: ClusterFadePhase | null
	readonly unit: CommentRenderUnit
}

/**
 * The base layer under the open/held/orphan slots: the fading cluster nodes when clustering is on,
 * or the plain thread list when it's off. A `thread` candidate is always drawn plain; a `node`
 * candidate carries the fade phase it should animate with.
 * @internal
 */
export type CommentBaseCandidate =
	| { readonly kind: 'node'; readonly node: ClusterNode; readonly phase: ClusterFadePhase }
	| { readonly kind: 'thread'; readonly threadId: string }

export interface CommentRenderPlanInput {
	readonly openThreadId: string | null
	readonly heldThreadIds: readonly string[]
	readonly orphanThreadIds: readonly string[]
	readonly base: readonly CommentBaseCandidate[]
	readonly pinStacks: ReadonlyMap<string, readonly string[]>
}

/** Coincident pins at one anchor render as a single stack, so they share one dedup key. */
function stackKey(group: readonly string[]): string {
	return `stack:${[...group].sort().join('|')}`
}

/**
 * The pin-stack group a node stands entirely inside — a coincident stack that renders as one
 * cascading count-badge rather than a zoom-to-split cluster badge. Null when the node's members
 * don't all share a stack. Mirrors the `stackGroupOf` guard the overlay used per-render.
 * @internal
 */
export function pureStackGroup(
	node: ClusterNode,
	pinStacks: ReadonlyMap<string, readonly string[]>
): readonly string[] | null {
	const group = pinStacks.get(node.members[0])
	if (!group) return null
	return node.members.every((id) => group.includes(id)) ? group : null
}

/**
 * Resolves every thread/stack/badge the comments overlay should draw into a flat, deduplicated
 * plan. Candidates are claimed in priority order — the open thread first, then held, then orphan,
 * then the base layer — so a thread that is a candidate in several slots at once (as happens the
 * instant it opens: its old cluster node lingers for the exit fade while the open slot mounts it
 * fresh) is drawn by the highest-priority slot only. Duplicate renders are impossible by
 * construction, which is what previously required a separate guard in each slot.
 * @internal
 */
export function resolveCommentRenderPlan(input: CommentRenderPlanInput): CommentRenderEntry[] {
	const { openThreadId, heldThreadIds, orphanThreadIds, base, pinStacks } = input
	const claimed = new Set<string>()
	const plan: CommentRenderEntry[] = []

	const claimThread = (threadId: string, phase: ClusterFadePhase | null) => {
		const group = pinStacks.get(threadId)
		const key = group ? stackKey(group) : `pin:${threadId}`
		if (claimed.has(key)) return
		claimed.add(key)
		plan.push({ key, phase, unit: group ? { kind: 'stack', group } : { kind: 'pin', threadId } })
	}

	if (openThreadId) claimThread(openThreadId, null)
	for (const id of heldThreadIds) claimThread(id, null)
	for (const id of orphanThreadIds) claimThread(id, null)

	for (const candidate of base) {
		if (candidate.kind === 'thread') {
			claimThread(candidate.threadId, null)
			continue
		}
		const { node, phase } = candidate
		if (node.count === 1) {
			claimThread(node.id, phase)
			continue
		}
		if (pureStackGroup(node, pinStacks)) {
			claimThread(node.members[0], phase)
			continue
		}
		const key = `badge:${node.id}`
		if (claimed.has(key)) continue
		claimed.add(key)
		plan.push({ key, phase, unit: { kind: 'badge', node } })
	}

	return plan
}
