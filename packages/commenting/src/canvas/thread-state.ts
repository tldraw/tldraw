import { TLCommentAnchor, TLCommentThread } from '@tldraw/comments'
import { atom, Editor, TLShapeId } from 'tldraw'

/** The id of the one open thread (only one popover is open at a time), or null when all closed. */
export const openThreadId = atom<string | null>('openThreadId', null)

/** Where a thread's pin sits on the page, for each anchor kind. Null hides the pin. */
export function anchorPagePoint(
	editor: Editor,
	anchor: TLCommentAnchor
): { x: number; y: number } | null {
	switch (anchor.type) {
		case 'shape':
		case 'text-range': {
			const bounds = editor.getShapePageBounds(anchor.shapeId as TLShapeId)
			if (!bounds) return null
			return { x: bounds.maxX, y: bounds.minY }
		}
		case 'point':
			return { x: anchor.x, y: anchor.y }
		case 'region':
			return { x: anchor.x + anchor.w, y: anchor.y }
		case 'page':
			return null
	}
}

/** Open a thread and bring it into view — switch to its page if needed, then center its pin. */
export function focusThread(editor: Editor, thread: TLCommentThread): void {
	if (thread.pageId !== editor.getCurrentPageId()) {
		editor.setCurrentPage(thread.pageId as any)
	}
	openThreadId.set(thread.id)
	const point = anchorPagePoint(editor, thread.anchor)
	if (point) editor.centerOnPoint(point, { animation: { duration: 200 } })
}
