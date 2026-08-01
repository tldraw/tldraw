import type { Editor, TLCommentThread } from 'tldraw'
import type { LeafInput } from '../clustering/types'
import { anchorPagePoint } from './thread-state'

/** The cluster leaves for the threads pinned on the current page. @internal */
export function collectClusterLeaves(
	editor: Editor,
	threads: readonly TLCommentThread[],
	openThreadId: string | null
): LeafInput[] {
	const pageId = editor.getCurrentPageId()
	const leaves: LeafInput[] = []

	for (const thread of threads) {
		if (thread.id === openThreadId) continue
		if (thread.pageId !== pageId) continue

		const point = anchorPagePoint(editor, thread.anchor)
		if (!point) continue

		leaves.push({
			id: thread.id,
			point: { x: point.x, y: point.y },
		})
	}

	return leaves
}

/**
 * Whether two leaf lists have the same threads at the same positions, in the same order — value
 * equality over everything that feeds the cluster table. Used to keep the leaves' array identity
 * stable across recomputes that didn't change anything (a reply, a reaction, a resolve), so the
 * expensive table rebuild only runs when the input actually changed.
 * @internal
 */
export function clusterLeavesEqual(a: readonly LeafInput[], b: readonly LeafInput[]): boolean {
	if (a === b) return true
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		const la = a[i]
		const lb = b[i]
		if (la.id !== lb.id || la.point.x !== lb.point.x || la.point.y !== lb.point.y) return false
	}
	return true
}

/**
 * Whether two leaf lists contain the same thread ids in the same order, ignoring positions. Used
 * mid-drag: while shapes are moving, position-only changes keep the previous leaves (deferring the
 * table rebuild, and with it the pop-out of any pin folded into a badge, until the drag settles —
 * see `useClusterModel`), but an added or removed thread still rebuilds promptly.
 * @internal
 */
export function clusterLeafIdsEqual(a: readonly LeafInput[], b: readonly LeafInput[]): boolean {
	if (a === b) return true
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i].id !== b[i].id) return false
	}
	return true
}
