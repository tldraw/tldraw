import type { Editor, TLCommentThread } from 'tldraw'
import type { LeafInput } from '../clustering/types'
import { anchorPagePoint } from './thread-state'

export function collectClusterLeaves(
	editor: Editor,
	threads: readonly TLCommentThread[],
	openThreadId: string | null,
	impreciseShapeAnchor?: { x: number; y: number }
): LeafInput[] {
	const pageId = editor.getCurrentPageId()
	const leaves: LeafInput[] = []

	for (const thread of threads) {
		if (thread.id === openThreadId) continue
		if (thread.pageId !== pageId) continue

		const point = anchorPagePoint(editor, thread.anchor, impreciseShapeAnchor)
		if (!point) continue

		leaves.push({
			id: thread.id,
			point: { x: point.x, y: point.y },
		})
	}

	return leaves
}
