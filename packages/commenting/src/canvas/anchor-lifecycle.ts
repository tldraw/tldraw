import { WeakCache } from '@tldraw/utils'
import { Editor, TLCommentAnchor, TLCommentThread, TLPageId, TLShapeId, VecLike } from 'tldraw'
import { commitCommentMutation } from './comment-mutations'
import { getCommentRecord, getComments, getCommentThreads, TLCommentRecord } from './comment-store'
import { anchorPagePoint, impreciseShapePinInset } from './thread-state'

type ShapeAnchor = Extract<TLCommentAnchor, { type: 'shape' }>

/**
 * Threads converted to point anchors because their shape was deleted, kept so the anchor can be
 * restored if the shape comes back. Owned by the editor, not the registration closure: the
 * registering effect can re-run, and an undo can arrive long after the delete.
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
	return anchor.type === 'shape' && anchor.shapeId === shapeId
}

/**
 * Keep shape-anchored threads alive across their shape's lifecycle:
 *
 * - When the shape is deleted, the thread converts to a `point` anchor where its pin last sat, so
 *   the conversation outlives the shape instead of becoming invisible.
 * - When the shape moves to another page, the thread follows: its `pageId` and each comment's
 *   denormalized `pageId` update, and the anchor keeps riding the shape.
 * - When a deleted shape comes back, the thread re-attaches — unless its pin was manually moved in
 *   the meantime, in which case the manual placement wins.
 *
 * A page move is `deleteShapes` + re-create with preserved ids inside one `editor.run`, but each
 * store write is its own operation, so "this shape is being moved" is never observable as a single
 * event. The handlers therefore cooperate across operations: `beforeDelete` snapshots where each
 * affected pin sits, the operation-complete pass converts threads whose shape is really gone, and
 * `afterCreate` plus that same pass restore the anchor once the store has settled. Undo/redo of a
 * move replays as a `parentId` update, so `afterChange` re-homes threads on cross-page reparents —
 * including threads anchored to descendants, which move without change events of their own.
 *
 * Remote changes are ignored: the client that performed the operation runs this same maintenance
 * and syncs the result. Writes honour the {@link CommentingOptions.history} option.
 *
 * Registered by `CanvasComments` on mount; parts-built consumers can call this directly. Returns a
 * cleanup function that unregisters all handlers.
 *
 * @public
 */
export function registerCommentAnchorLifecycle(editor: Editor): () => void {
	// Pin positions snapshotted during the current operation: shape id -> (thread id -> pin page
	// point).
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
				let snapshot = pendingByShape.get(shape.id)
				if (!snapshot) {
					snapshot = new Map()
					pendingByShape.set(shape.id, snapshot)
				}
				// Snapshot where the pin is drawn, not just the anchor point: imprecise shape pins render inset
				// toward the shape's centre, so without baking the inset in at the current zoom the pin would jump.
				let point = anchorPagePoint(editor, thread.anchor)
				const inset = impreciseShapePinInset(editor, thread.anchor)
				if (point && inset) {
					const zoom = editor.getZoomLevel()
					point = { x: point.x + inset.x / zoom, y: point.y + inset.y / zoom }
				}
				snapshot.set(thread.id, point)
			}
		}
	)

	// Shape ids from `convertedByShape` re-created during the current operation. Settled at operation
	// complete rather than in `afterCreate`: creation order within an operation is arbitrary, so a shape
	// can appear before its parent and not resolve an ancestor page yet.
	const returnedShapeIds = new Set<TLShapeId>()

	const disposeOperationComplete = editor.sideEffects.registerOperationCompleteHandler((source) => {
		// Only user-sourced handlers populate the maps and only local operations should settle
		// them; a remote operation completing leaves any (impossible-in-practice) leftovers for
		// the next local settle rather than judging them against remote state.
		if (source === 'remote') return
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
			commitCommentMutation(editor, ({ put }) => put(updates))
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
				if (anchor.type !== 'shape') continue
				if (!movedIds.has(anchor.shapeId)) continue
				if (thread.pageId === pageId) continue
				rehomeThread(thread, pageId, updates)
			}
			if (updates.length > 0) {
				commitCommentMutation(editor, ({ put }) => put(updates))
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
