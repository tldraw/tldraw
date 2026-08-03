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
