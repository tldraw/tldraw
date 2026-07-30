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
