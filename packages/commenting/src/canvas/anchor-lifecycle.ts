import { Editor, TLCommentAnchor, TLCommentThread, TLPageId, TLShapeId, VecLike } from 'tldraw'
import {
	getCommentRecord,
	getComments,
	getCommentThreads,
	putCommentRecords,
	TLCommentRecord,
} from './comment-store'
import { commitCommentMutation } from './state'
import { anchorPagePoint, DEFAULT_IMPRECISE_SHAPE_ANCHOR } from './thread-state'

type ShapeAnchor = Extract<TLCommentAnchor, { type: 'shape' | 'text-range' }>

function isAnchoredToShape(
	thread: TLCommentThread,
	shapeId: TLShapeId
): thread is TLCommentThread & { anchor: ShapeAnchor } {
	const anchor = thread.anchor
	return (anchor.type === 'shape' || anchor.type === 'text-range') && anchor.shapeId === shapeId
}

/**
 * Keep shape-anchored threads (`shape` and `text-range` anchors) alive across their shape's
 * lifecycle:
 *
 * - When the shape is deleted, the thread converts to a `point` anchor at the spot its pin last
 *   occupied, so the conversation outlives the shape instead of becoming invisible (a missing
 *   shape has no bounds, which hides the pin).
 * - When the shape moves to another page, the thread follows: its `pageId` and each comment's
 *   denormalized `pageId` update to the shape's new page, and the anchor keeps riding the shape.
 * - When a deleted shape comes back (a page move re-creates it with its id preserved; undoing a
 *   delete restores it), the thread re-attaches — unless its pin was manually moved in the
 *   meantime, in which case the manual placement wins.
 *
 * A page move is `deleteShapes` + re-create with preserved ids inside one `editor.run`, but each
 * store write is its own operation — so at no single moment does "this shape is being moved"
 * exist as an observable event. The handlers therefore cooperate across operations:
 * `beforeDelete` captures where each affected pin sits (every record is still in the store at
 * that point, so page bounds resolve even for children of a deleted frame); the
 * operation-complete pass converts threads whose shape is really gone, remembering the original
 * anchor; `afterCreate` restores that anchor when the shape id reappears. Undo/redo of a move
 * replays as a `parentId` update (remove + add of one id squash to an update in the history
 * diff), so an `afterChange` handler re-homes threads on cross-page reparents — including
 * threads anchored to descendants, which move with their parent without change events of their
 * own.
 *
 * Remote changes are ignored: the client that performed the operation runs this same
 * maintenance and syncs the resulting thread updates. Writes go through
 * {@link commitCommentMutation}, so the consumer's history option governs whether they're
 * undoable.
 *
 * Registered by `CanvasComments` on mount; parts-built consumers can call this directly.
 * Returns a cleanup function that unregisters all handlers.
 *
 * @public
 */
export function registerCommentAnchorLifecycle(
	editor: Editor,
	impreciseShapeAnchor: { x: number; y: number } = DEFAULT_IMPRECISE_SHAPE_ANCHOR
): () => void {
	// Captured during the current operation: shape id -> (thread id -> pin page point).
	const pendingByShape = new Map<TLShapeId, Map<string, VecLike | null>>()
	// Threads converted to point anchors because their shape was deleted, kept so the anchor can
	// be restored if the shape comes back (page move re-create, undo of the delete).
	const convertedByShape = new Map<
		TLShapeId,
		{ threadId: string; anchor: ShapeAnchor; point: VecLike }[]
	>()

	function rehomeThread(thread: TLCommentThread, pageId: TLPageId, updates: TLCommentRecord[]) {
		updates.push({ ...thread, pageId })
		for (const comment of getComments(editor)) {
			if (comment.threadId === thread.id) updates.push({ ...comment, pageId })
		}
	}

	const disposeBeforeDelete = editor.sideEffects.registerBeforeDeleteHandler(
		'shape',
		(shape, source) => {
			if (source === 'remote') return
			for (const thread of getCommentThreads(editor)) {
				if (!isAnchoredToShape(thread, shape.id)) continue
				let captured = pendingByShape.get(shape.id)
				if (!captured) {
					captured = new Map()
					pendingByShape.set(shape.id, captured)
				}
				captured.set(thread.id, anchorPagePoint(editor, thread.anchor, impreciseShapeAnchor))
			}
		}
	)

	const disposeOperationComplete = editor.sideEffects.registerOperationCompleteHandler(() => {
		if (pendingByShape.size === 0) return
		const settled = [...pendingByShape.entries()]
		pendingByShape.clear()

		const updates: TLCommentRecord[] = []
		for (const [shapeId, threadPoints] of settled) {
			if (editor.getShape(shapeId)) continue
			for (const [threadId, point] of threadPoints) {
				if (!point) continue
				const thread = getCommentRecord(editor, threadId)
				if (!thread || thread.typeName !== 'comment-thread') continue
				if (!isAnchoredToShape(thread, shapeId)) continue
				let converted = convertedByShape.get(shapeId)
				if (!converted) {
					converted = []
					convertedByShape.set(shapeId, converted)
				}
				converted.push({ threadId, anchor: thread.anchor, point })
				updates.push({ ...thread, anchor: { type: 'point', x: point.x, y: point.y } })
			}
		}

		if (updates.length > 0) {
			commitCommentMutation(editor, () => putCommentRecords(editor, updates))
		}
	})

	const disposeAfterCreate = editor.sideEffects.registerAfterCreateHandler(
		'shape',
		(shape, source) => {
			if (source === 'remote') return
			const converted = convertedByShape.get(shape.id)
			if (!converted) return
			convertedByShape.delete(shape.id)

			const pageId = editor.getAncestorPageId(shape)
			if (!pageId) return
			const updates: TLCommentRecord[] = []
			for (const { threadId, anchor, point } of converted) {
				const thread = getCommentRecord(editor, threadId)
				if (!thread || thread.typeName !== 'comment-thread') continue
				// Re-attach only threads still sitting exactly where the conversion left them — a
				// pin moved since then was placed deliberately, and that placement wins.
				const current = thread.anchor
				if (current.type !== 'point' || current.x !== point.x || current.y !== point.y) {
					continue
				}
				if (thread.pageId === pageId) {
					updates.push({ ...thread, anchor })
				} else {
					rehomeThread({ ...thread, anchor }, pageId, updates)
				}
			}
			if (updates.length > 0) {
				commitCommentMutation(editor, () => putCommentRecords(editor, updates))
			}
		}
	)

	const disposeAfterChange = editor.sideEffects.registerAfterChangeHandler(
		'shape',
		(prev, next, source) => {
			if (source === 'remote') return
			if (prev.parentId === next.parentId) return
			const pageId = editor.getAncestorPageId(next)
			if (!pageId) return
			// Descendants move with their parent without change events of their own.
			const movedIds = editor.getShapeAndDescendantIds([next.id])
			const updates: TLCommentRecord[] = []
			for (const thread of getCommentThreads(editor)) {
				const anchor = thread.anchor
				if (anchor.type !== 'shape' && anchor.type !== 'text-range') continue
				if (!movedIds.has(anchor.shapeId)) continue
				if (thread.pageId === pageId) continue
				rehomeThread(thread, pageId, updates)
			}
			if (updates.length > 0) {
				commitCommentMutation(editor, () => putCommentRecords(editor, updates))
			}
		}
	)

	return () => {
		disposeBeforeDelete()
		disposeOperationComplete()
		disposeAfterCreate()
		disposeAfterChange()
	}
}
