import { WeakCache } from '@tldraw/utils'
import { Editor, TLCommentAnchor, TLCommentThread, TLPageId, TLShapeId, VecLike } from 'tldraw'
import {
	getCommentRecord,
	getComments,
	getCommentThreads,
	putCommentRecords,
	TLCommentRecord,
} from './comment-store'
import { getCommentingOptions } from './options'
import { commitCommentMutation } from './state'
import { anchorPagePoint, impreciseShapePinInset } from './thread-state'

type ShapeAnchor = Extract<TLCommentAnchor, { type: 'shape' | 'text-range' }>

/**
 * Threads converted to point anchors because their shape was deleted, kept so the anchor can be
 * restored if the shape comes back (page move re-create, undo of the delete). Owned by the
 * editor, not the registration closure: the registering effect can re-run (a prop identity
 * change, a remount), and an undo can arrive arbitrarily long after the delete — the memory has
 * to outlive any one registration.
 */
const convertedByShapeCache = new WeakCache<
	Editor,
	Map<TLShapeId, { threadId: string; anchor: ShapeAnchor; point: VecLike }[]>
>()

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
 * anchor; `afterCreate` notes a reappeared shape id, and the operation-complete pass restores
 * the anchor once the store has settled (creation order within an operation is arbitrary, so a
 * fresh shape may not resolve an ancestor page mid-operation). Undo/redo of a move
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
	impreciseShapeAnchor?: { x: number; y: number }
): () => void {
	// Captured during the current operation: shape id -> (thread id -> pin page point).
	const pendingByShape = new Map<TLShapeId, Map<string, VecLike | null>>()
	const convertedByShape = convertedByShapeCache.get(editor, () => new Map())

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
				// Capture where the pin is drawn, not just the anchor point: imprecise shape pins
				// render inset toward the shape's centre, and the converted point pin renders at
				// its point exactly — without the inset the pin would jump on deletion. The inset
				// is screen-fixed, so bake it in at the current zoom. The imprecise spot resolves
				// from the editor's commenting options unless the caller overrides it (the overlay
				// passes its prop through).
				const spot = impreciseShapeAnchor ?? getCommentingOptions(editor).impreciseShapeAnchor
				let point = anchorPagePoint(editor, thread.anchor, spot)
				const inset = impreciseShapePinInset(thread.anchor, spot)
				if (point && inset) {
					const zoom = editor.getZoomLevel()
					point = { x: point.x + inset.x / zoom, y: point.y + inset.y / zoom }
				}
				captured.set(thread.id, point)
			}
		}
	)

	// Shape ids from `convertedByShape` re-created during the current operation. Restores are
	// settled at operation complete rather than in `afterCreate` itself: creation order within an
	// operation is arbitrary, so a shape can appear before its parent and not resolve an ancestor
	// page yet — and the conversion memory must outlive any such partial state.
	const returnedShapeIds = new Set<TLShapeId>()

	const disposeOperationComplete = editor.sideEffects.registerOperationCompleteHandler(() => {
		if (pendingByShape.size === 0 && returnedShapeIds.size === 0) return
		const settled = [...pendingByShape.entries()]
		pendingByShape.clear()
		const returned = [...returnedShapeIds]
		returnedShapeIds.clear()

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

		for (const shapeId of returned) {
			const shape = editor.getShape(shapeId)
			if (!shape) continue
			const converted = convertedByShape.get(shapeId)
			if (!converted) continue
			convertedByShape.delete(shapeId)

			const pageId = editor.getAncestorPageId(shape)
			for (const { threadId, anchor, point } of converted) {
				const thread = getCommentRecord(editor, threadId)
				if (!thread || thread.typeName !== 'comment-thread') continue
				// Re-attach only threads still sitting exactly where the conversion left them — a
				// pin moved since then was placed deliberately, and that placement wins.
				const current = thread.anchor
				if (current.type !== 'point' || current.x !== point.x || current.y !== point.y) {
					continue
				}
				if (!pageId || thread.pageId === pageId) {
					updates.push({ ...thread, anchor })
				} else {
					rehomeThread({ ...thread, anchor }, pageId, updates)
				}
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
			if (convertedByShape.has(shape.id)) returnedShapeIds.add(shape.id)
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
