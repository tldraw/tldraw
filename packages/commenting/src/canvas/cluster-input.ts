import type { Editor, TLCommentThread, VecLike } from 'tldraw'
import type { LeafInput, LeafScreenOffsets } from '../clustering/types'
import { anchorPagePoint, impreciseShapePinInset } from './thread-state'

/** The clustering input for the current page's pinned threads. @internal */
export interface ClusterInput {
	/** One leaf per pinned thread, at its anchor page point. */
	leaves: LeafInput[]
	/**
	 * The render offsets of the imprecise pins among the leaves — those draw tucked into their
	 * shape by a constant screen-px inset rather than on their anchor, and the clustering prices
	 * their merges at the visual positions. Undefined when every pin renders on its anchor,
	 * which guarantees a byte-identical offset-unaware clustering run.
	 */
	screenOffsets: LeafScreenOffsets | undefined
}

/** The cluster leaves for the threads pinned on the current page. @internal */
export function collectClusterLeaves(
	editor: Editor,
	threads: readonly TLCommentThread[],
	openThreadId: string | null
): ClusterInput {
	const pageId = editor.getCurrentPageId()
	const leaves: LeafInput[] = []
	let screenOffsets: Map<string, VecLike> | undefined

	for (const thread of threads) {
		if (thread.id === openThreadId) continue
		if (thread.pageId !== pageId) continue

		const point = anchorPagePoint(editor, thread.anchor)
		if (!point) continue

		leaves.push({
			id: thread.id,
			point: { x: point.x, y: point.y },
		})

		const inset = impreciseShapePinInset(editor, thread.anchor)
		if (inset) (screenOffsets ??= new Map()).set(thread.id, inset)
	}

	return { leaves, screenOffsets }
}

/**
 * Whether two cluster inputs are value-equal — same leaves at the same positions in the same order,
 * and the same render offsets. Everything `computeClusterTable` reads, in other words. Used to keep
 * the input's identity stable across recomputes that didn't change anything (a reply, a reaction, a
 * resolve), so the expensive table rebuild only runs when the input actually changed.
 * @internal
 */
export function clusterInputEqual(a: ClusterInput, b: ClusterInput): boolean {
	if (a === b) return true
	return (
		clusterLeavesEqual(a.leaves, b.leaves) && screenOffsetsEqual(a.screenOffsets, b.screenOffsets)
	)
}

/**
 * Whether two cluster inputs describe the same leaves, ignoring everything positional — the anchor
 * points and the offset vectors alike. Used mid-drag: while shapes are moving, position-only changes
 * keep the previous input (deferring the table rebuild, and with it the pop-out of any pin folded
 * into a badge, until the drag settles — see `useClusterModel`), but an added or removed thread, or
 * one that changed precision, still rebuilds promptly.
 * @internal
 */
export function clusterInputIdsEqual(a: ClusterInput, b: ClusterInput): boolean {
	if (a === b) return true
	return (
		clusterLeafIdsEqual(a.leaves, b.leaves) &&
		screenOffsetIdsEqual(a.screenOffsets, b.screenOffsets)
	)
}

/** Value equality for the offset maps: same ids, each with the same offset vector. */
function screenOffsetsEqual(a: LeafScreenOffsets | undefined, b: LeafScreenOffsets | undefined) {
	if (a === b) return true
	if (!a || !b) return false
	if (a.size !== b.size) return false
	for (const [id, offset] of b) {
		const prev = a.get(id)
		if (!prev || prev.x !== offset.x || prev.y !== offset.y) return false
	}
	return true
}

/** Which leaves carry an offset at all, ignoring the vectors — the mid-drag counterpart. A leaf
 *  gains or loses one by changing precision, which is a record change, not a gesture. */
function screenOffsetIdsEqual(a: LeafScreenOffsets | undefined, b: LeafScreenOffsets | undefined) {
	if (a === b) return true
	if (!a || !b) return false
	if (a.size !== b.size) return false
	for (const id of b.keys()) {
		if (!a.has(id)) return false
	}
	return true
}

/** Whether two leaf lists have the same threads at the same positions, in the same order. */
function clusterLeavesEqual(a: readonly LeafInput[], b: readonly LeafInput[]): boolean {
	if (a === b) return true
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		const la = a[i]
		const lb = b[i]
		if (la.id !== lb.id || la.point.x !== lb.point.x || la.point.y !== lb.point.y) return false
	}
	return true
}

/** Whether two leaf lists contain the same thread ids in the same order, ignoring positions. */
function clusterLeafIdsEqual(a: readonly LeafInput[], b: readonly LeafInput[]): boolean {
	if (a === b) return true
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i].id !== b[i].id) return false
	}
	return true
}
