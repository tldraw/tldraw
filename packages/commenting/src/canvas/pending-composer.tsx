import { Avatar, isMentionPickerOpen } from '@tldraw/mentions'
import {
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from 'react'
import {
	createComment,
	createCommentThread,
	defineMessages,
	Editor,
	EditorPortal,
	TLCommentAnchor,
	TLRichText,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
	VecLike,
} from 'tldraw'
import { CommentComposer } from '../ui/comment-composer'
import { EMPTY_COMMENT, isCommentEmpty } from '../ui/comment-extensions'
import { CommentPin } from '../ui/comment-pin'
import { forwardPointerEventToCanvas, isCanvasPanGesture, startCommentDrag } from './canvas-events'
import {
	clearCommentDraft,
	getCommentDraft,
	NEW_COMMENT_DRAFT,
	saveCommentDraft,
} from './comment-drafts'
import { commitCommentMutation } from './comment-mutations'
import { UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { PendingComment, pendingCommentAt } from './comment-tool'
import { type CommentingContext } from './context'
import { useIsMobileCommenting, useMobilePlacement } from './mobile-placement'
import { useCanComment, useCommentingOptions } from './options'
import { pendingComment } from './state'
import {
	commentTargetShapeAt,
	regionAnchorPinCorner,
	regionPinPoint,
	regionWithPinAt,
} from './thread-state'
import { avatarRenderer } from './thread-view'

const messages = defineMessages({
	commentsSend: { id: 'comments.send', defaultMessage: 'Send' },
	commentsAddPlaceholder: { id: 'comments.add-placeholder', defaultMessage: 'Add a comment…' },
})

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

/**
 * The composer for a thread that doesn't exist yet: the comment tool has placed a point (or
 * region) and is waiting on a first comment. Submitting creates the thread and its comment
 * together; clicking away keeps the draft for the next placement.
 */
export function PendingComposer({
	editor,
	pending,
	currentUserId,
	resolveAuthor,
	onPostComment,
	getMentionSuggestions,
	renderMentionSuggestion,
}: CommentingContext & { editor: Editor; pending: PendingComment }) {
	const { components } = useCommentingOptions()
	const ComposerFallback = components.ComposerFallback
	const canComment = useCanComment(currentUserId)
	const me = currentUserId ? resolveAuthor(currentUserId) : undefined
	const isMobile = useIsMobileCommenting()
	const drag = useDraftDrag(editor, pending)
	// The leading pin previews the pin this draft becomes: a white pin holding the author's avatar.
	const draftAvatar = (
		<div
			className="tlui-cmt-canvas-composer__handle"
			// On mobile the composer floats free of its point, so there's no pin to drag.
			{...(isMobile ? {} : drag.handlers)}
		>
			<CommentPin>
				{avatarRenderer(components, currentUserId)?.(me ?? UNKNOWN_COMMENT_AUTHOR) ?? (
					<Avatar author={me ?? UNKNOWN_COMMENT_AUTHOR} />
				)}
			</CommentPin>
		</div>
	)
	// Click-away keeps the draft (saved on every change) and the next placement composer
	// restores it — the flip side of dismissing without a discard warning.
	const [text, setText] = useState<TLRichText>(
		() => getCommentDraft(NEW_COMMENT_DRAFT) ?? EMPTY_COMMENT
	)
	const ref = useRef<HTMLDivElement>(null)
	const msg = useTranslation()
	// Over this floating panel, a scroll reaches the canvas (except where it scrolls itself).
	usePassThroughWheelEvents(ref)

	const point = useValue('composer point', () => editor.pageToViewport(pending.point), [
		editor,
		pending.point,
	])
	// On mobile the composer floats free of the pin so it can clear the software keyboard; desktop
	// keeps it pinned to the point.
	const placed = useMobilePlacement(ref, point, isMobile)

	// Escape steps back one level at a time: a draft with text is cleared first, and only an empty
	// one closes. A native listener on the composer, because the editor's own Escape handler (which
	// would also cancel the comment tool) sits on its container, below React's root listener.
	const textRef = useRef(text)
	textRef.current = text
	useEffect(() => {
		const el = ref.current
		if (!el) return
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || isMentionPickerOpen()) return
			e.stopPropagation()
			if (!isCommentEmpty(textRef.current)) {
				setText(EMPTY_COMMENT)
				clearCommentDraft(NEW_COMMENT_DRAFT)
				return
			}
			pendingComment.set(editor, null)
			// Focus would drop to the page with the composer gone, out of reach of the next Escape.
			editor.getContainer().focus()
		}
		el.addEventListener('keydown', onKeyDown)
		return () => el.removeEventListener('keydown', onKeyDown)
	}, [editor])

	// Dismiss on a click anywhere outside the composer (capture-phase, ahead of stopPropagation).
	useEffect(() => {
		const onPointerDown = (e: PointerEvent) => {
			const el = ref.current
			const target = e.target as HTMLElement | null
			if (!el || !target) return
			// A click in the composer, or in the mention picker it spawns (portaled elsewhere), is
			// not "outside" — keep the draft open so the pick can insert.
			if (el.contains(target) || target.closest('.tlui-cmt-mention-popup')) return
			// Panning the camera to look around while writing isn't leaving the draft.
			if (isCanvasPanGesture(editor, e) || (e as any).isSpecialRedispatchedEvent) return
			pendingComment.set(editor, null)
		}
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => document.removeEventListener('pointerdown', onPointerDown, true)
	}, [editor])

	const submit = () => {
		if (isCommentEmpty(text) || !currentUserId) return
		const comment = commitCommentMutation(editor, ({ put }) => {
			const pageId = editor.getCurrentPageId()
			const thread = createCommentThread({
				pageId,
				anchor: pending.anchor,
				createdBy: currentUserId,
			})
			const comment = createComment({
				threadId: thread.id,
				pageId,
				authorId: currentUserId,
				body: text,
			})
			put([thread, comment])
			return comment
		})
		setText(EMPTY_COMMENT)
		clearCommentDraft(NEW_COMMENT_DRAFT)
		pendingComment.set(editor, null)
		// The host's callback is its own operation, not part of the post's history scope. It runs
		// last so a throwing host can't strand the composer holding a draft of a posted comment.
		onPostComment?.(comment)
	}

	return (
		<EditorPortal>
			<div
				ref={ref}
				className={[
					'tlui-cmt-canvas-composer',
					pending.anchor.type === 'region' && 'tlui-cmt-canvas-composer--region',
					drag.dragging && 'tlui-cmt-canvas-composer--dragging',
					!canComment && 'tlui-cmt-canvas-composer--fallback',
				]
					.filter(Boolean)
					.join(' ')}
				style={{ left: placed.left, top: placed.top }}
				onPointerDown={stop}
				onContextMenu={stop}
			>
				{canComment ? (
					<CommentComposer
						author={me ?? UNKNOWN_COMMENT_AUTHOR}
						placeholder={msg(messages.commentsAddPlaceholder)}
						sendLabel={msg(messages.commentsSend)}
						value={text}
						onChange={(value) => {
							setText(value)
							saveCommentDraft(NEW_COMMENT_DRAFT, value)
						}}
						onSubmit={submit}
						// No user, no author for the record — dead send button.
						disabled={isCommentEmpty(text) || !currentUserId}
						getMentionSuggestions={getMentionSuggestions}
						renderMentionSuggestion={renderMentionSuggestion}
						autoFocus
						leading={draftAvatar}
					/>
				) : (
					ComposerFallback && <ComposerFallback context="pending" />
				)}
			</div>
		</EditorPortal>
	)
}

/** Drag the draft by its avatar pin, the way a placed pin drags: the composer follows the pointer
 *  and, on release, re-anchors to the shape under it (a region translates, keeping its size). */
function useDraftDrag(editor: Editor, pending: PendingComment) {
	const [dragging, setDragging] = useState(false)
	const dragRef = useRef<{
		startX: number
		startY: number
		moved: boolean
		// The pin's page offset from the grab point, so the pin keeps its place under the pointer.
		offsetX: number
		offsetY: number
		clientX: number
		clientY: number
		endDrag?(): void
	} | null>(null)
	// Unmounting mid-drag (the draft is dismissed) gets no pointer up to end the drag, and the
	// drop-target hint is editor-global state that would otherwise stay on the shape.
	useEffect(
		() => () => {
			if (!dragRef.current) return
			dragRef.current.endDrag?.()
			editor.setHintingShapes([])
		},
		[editor]
	)

	const pagePointFor = (clientX: number, clientY: number) => {
		const drag = dragRef.current!
		const cursor = editor.screenToPage({ x: clientX, y: clientY })
		return { x: cursor.x + drag.offsetX, y: cursor.y + drag.offsetY }
	}

	// A region moves as a whole, its box riding with the pin corner; a point draft moves only its
	// composer until the drop, when its anchor resolves against what's under it.
	const moveRegion = (anchor: Extract<TLCommentAnchor, { type: 'region' }>, point: VecLike) => {
		const corner = regionAnchorPinCorner(anchor)
		const moved = regionWithPinAt(anchor, corner, point)
		pendingComment.set(editor, { anchor: moved, point: regionPinPoint(moved, corner) })
	}

	// Mid-drag, a point draft hints the shape a drop here would anchor to.
	const previewAt = (point: VecLike) => {
		const current = pendingComment.get(editor)
		if (!current) return
		if (current.anchor.type === 'region') return moveRegion(current.anchor, point)
		pendingComment.set(editor, { ...current, point: { x: point.x, y: point.y } })
		const hit = commentTargetShapeAt(editor, point)
		editor.setHintingShapes(hit ? [hit.id] : [])
	}

	const settleAt = (point: VecLike, altKey: boolean) => {
		const current = pendingComment.get(editor)
		if (!current) return
		if (current.anchor.type === 'region') return moveRegion(current.anchor, point)
		pendingComment.set(editor, pendingCommentAt(editor, point, altKey))
	}

	const takeDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current
		dragRef.current = null
		drag?.endDrag?.()
		editor.setHintingShapes([])
		setDragging(false)
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId)
		}
		return drag
	}

	const handlers = {
		onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
			// A middle/right-button or space-held press is a camera pan, not a drag.
			if (isCanvasPanGesture(editor, e)) {
				forwardPointerEventToCanvas(editor.getContainer(), e)
				return
			}
			const grab = editor.screenToPage({ x: e.clientX, y: e.clientY })
			dragRef.current = {
				startX: e.clientX,
				startY: e.clientY,
				clientX: e.clientX,
				clientY: e.clientY,
				moved: false,
				offsetX: pending.point.x - grab.x,
				offsetY: pending.point.y - grab.y,
			}
			e.currentTarget.setPointerCapture(e.pointerId)
		},
		// Keep focus in the comment field: grabbing the pin shouldn't blur what's being typed.
		onMouseDown: (e: ReactMouseEvent) => e.preventDefault(),
		onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
			const drag = dragRef.current
			if (!drag) return
			if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return
			drag.clientX = e.clientX
			drag.clientY = e.clientY
			if (!drag.moved) {
				drag.moved = true
				drag.endDrag = startCommentDrag(editor, {
					cursor: 'move',
					onCameraMove: () => {
						const d = dragRef.current
						if (d) previewAt(pagePointFor(d.clientX, d.clientY))
					},
				})
				setDragging(true)
			}
			previewAt(pagePointFor(e.clientX, e.clientY))
		},
		onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
			const moved = dragRef.current?.moved
			const point = moved ? pagePointFor(e.clientX, e.clientY) : null
			takeDrag(e)
			if (point) settleAt(point, e.altKey)
		},
		// A cancelled pointer leaves the draft where the drag last put it, with its anchor resolved.
		onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => {
			const drag = takeDrag(e)
			const current = pendingComment.get(editor)
			if (drag?.moved && current) settleAt(current.point, editor.inputs.getAltKey())
		},
	}

	return { dragging, handlers }
}
