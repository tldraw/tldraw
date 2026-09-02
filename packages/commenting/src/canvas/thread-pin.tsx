import { Avatar } from '@tldraw/mentions'
import {
	memo,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	type BoxModel,
	Editor,
	TLCommentThread,
	useContainer,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
} from 'tldraw'
import { CommentPin } from '../ui/comment-pin'
import { forwardPointerEventToCanvas, isCanvasPanGesture } from './canvas-events'
import { commitCommentMutation } from './comment-mutations'
import { UNKNOWN_AUTHOR, UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { type CommentingContext } from './context'
import { useThreadComments } from './hooks'
import { getCommentingOptions, useCanComment, useCommentingOptions } from './options'
import {
	REGION_CORNERS,
	REGION_HANDLE_MARGIN_PX,
	RegionBox,
	RegionResizeHandles,
} from './region-box'
import { openThreadId } from './state'
import { ThreadPreview, useMarkerPreview } from './thread-preview'
import {
	anchorPagePoint,
	commentTargetShapeAt,
	impreciseShapePinInset,
	isBoxInInflatedViewport,
	isInInflatedViewport,
	REGION_PIN_CORNER,
	regionAnchorPinCorner,
	regionPinPoint,
	shapeAnchorAt,
} from './thread-state'
import { POPOVER_OFFSET, ThreadPopover, ThreadView } from './thread-view'

/** The opened popover has a header row the hover preview lacks, so it opens this much higher — the
 *  first comment then lands where the preview's sat. Re-measure if the header height or the preview
 *  panel padding changes. */
const THREAD_HEADER_BLOCK = 36

/**
 * A single thread's pin: the marker at its anchor, the thread popover when it's open, the hover
 * preview, and — for a region anchor — the dashed box and its resize handles. Dragging the marker
 * re-anchors the thread.
 *
 * Memoized so a pin skips re-rendering when the layer re-renders for unrelated reasons; camera
 * tracking still works, since the pin subscribes to its own viewport position via signals.
 */
export const ThreadPin = memo(function ThreadPin({
	editor,
	thread,
	...props
}: CommentingContext & {
	editor: Editor
	thread: TLCommentThread
}) {
	const { resolveAuthor } = props
	const options = useCommentingOptions()
	const canComment = useCanComment(props.currentUserId)
	const container = useContainer()
	const msg = useTranslation()
	const comments = useThreadComments(editor, thread.id)
	// Only one thread's popover is open at a time — shared across pins via the atom.
	const open = useValue('thread open', () => openThreadId.get(editor) === thread.id, [
		editor,
		thread.id,
	])
	// While dragging the marker, its page point overrides the anchor's; committed on drop.
	const [dragPagePoint, setDragPagePoint] = useState<{ x: number; y: number } | null>(null)
	const [resizeBounds, setResizeBounds] = useState<BoxModel | null>(null)
	// Hovering the marker previews the thread's opening comment, on the delay every marker uses.
	const { previewShown, previewHandlers } = useMarkerPreview(editor, `pin:${thread.id}`)
	const previewThreads = useMemo(() => [thread], [thread])
	// The 'pointer' reveal mode: is the pointer within the region's bounds (plus a grab margin)?
	// Driven by pointer position, not DOM hover, so moving from anywhere in the region out to a corner
	// handle never loses the affordance — the box stays `pointer-events: none`.
	const pointerInRegion = useValue(
		'pointer in region',
		() => {
			if (thread.anchor.type !== 'region' || thread.pageId !== editor.getCurrentPageId())
				return false
			const m = REGION_HANDLE_MARGIN_PX / editor.getZoomLevel()
			const p = editor.inputs.getCurrentPagePoint()
			const a = thread.anchor
			return p.x >= a.x - m && p.x <= a.x + a.w + m && p.y >= a.y - m && p.y <= a.y + a.h + m
		},
		[editor, thread.anchor, thread.pageId]
	)
	// A region's box and handles are revealed while open, mid-resize, or while the pointer is
	// within the region.
	const revealed = open || resizeBounds != null || pointerInRegion
	// A region thread's pin corner is its own (the corner its creating drag released on), with
	// the default as the fallback for older records.
	const pinCorner =
		thread.anchor.type === 'region' ? regionAnchorPinCorner(thread.anchor) : REGION_PIN_CORNER
	// A region resizes from its corners — every corner but the pin's own, which the pin owns.
	const resizeHandles = useMemo(
		() => REGION_CORNERS.filter((c) => c.x !== pinCorner.x || c.y !== pinCorner.y),
		[pinCorner]
	)
	const dragRef = useRef<{
		startX: number
		startY: number
		moved: boolean
		// The anchor's page-space offset from the grab point, so a drag translates the pin by the
		// cursor's delta (like RegionBox's move) instead of snapping the anchor to the cursor.
		offsetX: number
		offsetY: number
	} | null>(null)
	const markerRef = useRef<HTMLButtonElement>(null)
	// Wheel pass-through sits on the marker (which is never scrollable), not the layer root —
	// see the note on the layer.
	usePassThroughWheelEvents(markerRef)

	// The drop-target hint is editor-global state with no automatic reset. If the pin unmounts
	// mid-drag (e.g. Shift+C hides comments), no pointer event will ever reach the drag handlers —
	// clear the hint here or it stays on the shape indefinitely.
	useEffect(() => {
		return () => {
			if (dragRef.current) editor.setHintingShapes([])
		}
	}, [editor])

	// Clicking outside the open popover closes the thread. Capture phase + a class check rather than
	// stopPropagation, since the popover portals elsewhere in the DOM. The marker is excluded so its own
	// click-to-toggle handles it instead of this closing and the toggle reopening.
	useEffect(() => {
		if (!open) return
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement | null
			if (!target) return
			if (target.closest('.tlui-cmt-canvas-popover')) return
			const marker = markerRef.current
			if (marker && marker.contains(target)) return
			// A press on a region's resize handle edits this thread — don't dismiss it.
			if (target.closest('.tlui-cmt-canvas-region-handle')) return
			// A click inside a menu/popover layered above us (the sidebar's filter or overflow
			// dropdown, or the composer's mention picker — all portaled elsewhere) belongs to that
			// layer; defer to its own dismissal instead of closing the thread out from under it.
			if (
				target.closest('.tlui-menu, [data-radix-popper-content-wrapper], .tlui-cmt-mention-popup')
			)
				return
			openThreadId.set(editor, null)
		}
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => document.removeEventListener('pointerdown', onPointerDown, true)
	}, [open, editor])

	// The pin must not unmount mid-interaction: an open thread's popover hangs off it, and a drag
	// or resize holds pointer capture on it — so those states are exempt from the viewport cull.
	const exemptFromCull = open || dragPagePoint != null || resizeBounds != null
	const point = useValue(
		'pin point',
		() => {
			if (thread.pageId !== editor.getCurrentPageId()) return null
			const pagePoint = anchorPagePoint(editor, thread.anchor)
			if (!pagePoint) return null
			const viewportPoint = editor.pageToViewport(pagePoint)
			const inset = impreciseShapePinInset(editor, thread.anchor)
			const point = inset
				? { x: viewportPoint.x + inset.x, y: viewportPoint.y + inset.y }
				: viewportPoint
			// Off-screen pins (plus a pre-mount margin) unmount rather than re-render every camera frame. A
			// region thread stays mounted while any part of its box is on screen, since the box renders here too.
			if (!exemptFromCull) {
				const visible =
					thread.anchor.type === 'region'
						? isBoxInInflatedViewport(editor, thread.anchor)
						: isInInflatedViewport(editor, point)
				if (!visible) return null
			}
			return point
		},
		[editor, thread.anchor, thread.pageId, exemptFromCull]
	)
	if (!point) return null

	const PinContent = options.components.PinContent
	const threadAuthor = resolveAuthor(thread.createdBy)
	const pinContent = PinContent ? (
		<PinContent thread={thread} comments={comments} />
	) : (
		<Avatar author={threadAuthor ?? UNKNOWN_COMMENT_AUTHOR} />
	)
	const pinLabel = msg(
		thread.resolved ? 'comments.pin-label-resolved' : 'comments.pin-label'
	).replace('{name}', threadAuthor?.name ?? UNKNOWN_AUTHOR)

	// Drag the marker to move the thread: position is overridden locally while dragging, then re-anchored
	// on drop. A region translates keeping its size; a barely-moved pointer is a click.
	const isRegion = thread.anchor.type === 'region'
	// The marker is a button (so it's keyboard-reachable), so the drag handlers are typed to it.
	const startDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
		// A middle/right-button or space-held press over a pin is a camera pan, not a pin drag —
		// hand it to the canvas untouched.
		if (isCanvasPanGesture(editor, e)) {
			forwardPointerEventToCanvas(container, e)
			return
		}
		e.stopPropagation()
		const grabPage = editor.screenToPage({ x: e.clientX, y: e.clientY })
		const anchorPage = anchorPagePoint(editor, thread.anchor)
		// The drag delta is taken from where the pin is drawn, which for an imprecise shape pin
		// is inset from its anchor point — without this the pin jumps by the inset on drag start.
		const inset = impreciseShapePinInset(editor, thread.anchor)
		if (anchorPage && inset) {
			const zoom = editor.getZoomLevel()
			anchorPage.x += inset.x / zoom
			anchorPage.y += inset.y / zoom
		}
		dragRef.current = {
			startX: e.clientX,
			startY: e.clientY,
			moved: false,
			offsetX: anchorPage ? anchorPage.x - grabPage.x : 0,
			offsetY: anchorPage ? anchorPage.y - grabPage.y : 0,
		}
		e.currentTarget.setPointerCapture(e.pointerId)
	}
	const onDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
		const drag = dragRef.current
		if (!drag) return
		// Moving a pin re-anchors the thread record — a commenting write. Without the permission the
		// press stays a click (`moved` never sets, so release toggles the popover and never commits).
		if (!canComment) return
		if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return
		drag.moved = true
		const cursorPage = editor.screenToPage({ x: e.clientX, y: e.clientY })
		const pagePoint = { x: cursorPage.x + drag.offsetX, y: cursorPage.y + drag.offsetY }
		setDragPagePoint(pagePoint)
		// Hint the shape the pin would re-anchor to on drop — the same hit-test endDrag resolves
		// with. Regions translate rather than re-anchor, so they never hint.
		if (!isRegion) {
			const hit = commentTargetShapeAt(editor, pagePoint)
			editor.setHintingShapes(hit ? [hit.id] : [])
		}
	}
	// A cancelled pointer (touch gesture takeover, browser interruption) aborts the drag outright:
	// no re-anchor commit, no click-toggle — the pin snaps back and the hint clears.
	const cancelDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
		const drag = dragRef.current
		dragRef.current = null
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId)
		}
		if (!drag) return
		setDragPagePoint(null)
		editor.setHintingShapes([])
	}
	const endDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
		const drag = dragRef.current
		dragRef.current = null
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId)
		}
		if (!drag) return
		editor.setHintingShapes([])
		if (!drag.moved) {
			openThreadId.set(editor, openThreadId.get(editor) === thread.id ? null : thread.id)
			return
		}
		const cursorPage = editor.screenToPage({ x: e.clientX, y: e.clientY })
		const pagePoint = { x: cursorPage.x + drag.offsetX, y: cursorPage.y + drag.offsetY }
		setDragPagePoint(null)
		let anchor: TLCommentThread['anchor']
		if (thread.anchor.type === 'region') {
			// Translate so the pin (the region's pin corner) lands at the drop; size unchanged.
			anchor = {
				...thread.anchor,
				x: pagePoint.x - pinCorner.x * thread.anchor.w,
				y: pagePoint.y - pinCorner.y * thread.anchor.h,
			}
		} else {
			const hit = commentTargetShapeAt(editor, pagePoint)
			anchor = hit
				? shapeAnchorAt(
						editor,
						hit.id,
						pagePoint,
						getCommentingOptions(editor).shouldBePrecise(editor, {
							shapeId: hit.id,
							point: pagePoint,
							altKey: e.altKey,
						})
					)
				: { type: 'point', x: pagePoint.x, y: pagePoint.y }
		}
		commitCommentMutation(editor, ({ put }) => put([{ ...thread, anchor }]), 'drag')
	}

	// The pin (and its popover) track the live edit: a resize moves it to the region's pin corner, a
	// move to the drag point; otherwise it sits at the stored anchor's viewport point.
	const livePinPage = resizeBounds ? regionPinPoint(resizeBounds, pinCorner) : dragPagePoint
	const renderPointBase = livePinPage ? editor.pageToViewport(livePinPage) : point
	// A region's pin centres on its corner — overlapping the box — rather than hanging off it.
	// The marker anchors bottom-left, so step half its 28px size (--tlui-cmt-pin-size) left and
	// down (screen px), matching the draft composer's --region centring on the same corner.
	const renderPoint = isRegion
		? { x: renderPointBase.x - 14, y: renderPointBase.y + 14 }
		: renderPointBase

	// A region's live box bounds, by priority: a corner resize, else a pin-drag translation (the pin
	// corner tracks the cursor), else the stored anchor. Undefined for non-region threads.
	const regionAnchor = thread.anchor.type === 'region' ? thread.anchor : undefined
	const movedRegion =
		regionAnchor && dragPagePoint
			? {
					...regionAnchor,
					x: dragPagePoint.x - pinCorner.x * regionAnchor.w,
					y: dragPagePoint.y - pinCorner.y * regionAnchor.h,
				}
			: regionAnchor
	const regionBoxBounds = resizeBounds ?? movedRegion
	const commitResize = (bounds: BoxModel) => {
		setResizeBounds(null)
		if (!canComment) return
		// Same commit path as a pin drag, so the configured `dragHistory` governs both — going
		// straight to `editor.run` here would make region resizes silently ignore the option.
		commitCommentMutation(
			editor,
			// Spread the existing anchor first so the region's pin corner survives a resize.
			({ put }) => put([{ ...thread, anchor: { ...regionAnchor!, ...bounds } }]),
			'drag'
		)
	}

	return (
		<>
			{regionBoxBounds && (dragPagePoint || revealed) && (
				<RegionBox editor={editor} box={regionBoxBounds} />
			)}
			{regionBoxBounds && revealed && !dragPagePoint && canComment && (
				<RegionResizeHandles
					editor={editor}
					box={regionBoxBounds}
					handles={resizeHandles}
					onPreview={setResizeBounds}
					onCommit={commitResize}
				/>
			)}
			<div
				className={[
					'tlui-cmt-canvas-pin',
					open && 'tlui-cmt-canvas-pin--open',
					dragPagePoint && 'tlui-cmt-canvas-pin--dragging',
				]
					.filter(Boolean)
					.join(' ')}
				style={{ left: renderPoint.x, top: renderPoint.y }}
			>
				<button
					ref={markerRef}
					type="button"
					className="tlui-cmt-button tlui-cmt-canvas-pin__marker"
					aria-label={pinLabel}
					aria-expanded={open}
					onPointerDown={startDrag}
					onPointerMove={onDrag}
					onPointerUp={endDrag}
					onPointerCancel={cancelDrag}
					// Pointer activation is already handled by endDrag (which distinguishes a click
					// from a drag), so only take keyboard-synthesised clicks here — those report
					// `detail === 0` — or the thread would toggle twice per mouse click.
					onClick={(e) => {
						if (e.detail !== 0) return
						openThreadId.set(editor, openThreadId.get(editor) === thread.id ? null : thread.id)
					}}
					onPointerEnter={previewHandlers.onPointerEnter}
					onPointerLeave={previewHandlers.onPointerLeave}
					// Focus stands in for hover, so tabbing to a marker gets the same preview.
					onFocus={previewHandlers.onPointerEnter}
					onBlur={previewHandlers.onPointerLeave}
				>
					<CommentPin resolved={thread.resolved != null} open={open}>
						{pinContent}
					</CommentPin>
				</button>
				{/* The popover portals up to the menus layer (above the UI panels) so it isn't clipped;
			    the pin itself stays in the canvas-in-front layer, beneath the UI. */}
				{open && (
					<ThreadPopover
						base={{
							x: renderPoint.x + POPOVER_OFFSET.thread.x,
							y: renderPoint.y + POPOVER_OFFSET.thread.y - THREAD_HEADER_BLOCK,
						}}
					>
						<ThreadView editor={editor} thread={thread} {...props} />
					</ThreadPopover>
				)}
				{/* Not while dragging: the pin is being moved, not read, and a panel trailing the
				    cursor would obscure the drop target. */}
				{previewShown && !dragPagePoint && (
					<ThreadPreview
						editor={editor}
						threads={previewThreads}
						variant="thread"
						point={renderPoint}
						onSelectThread={() => openThreadId.set(editor, thread.id)}
						{...previewHandlers}
						currentUserId={props.currentUserId}
						resolveAuthor={resolveAuthor}
					/>
				)}
			</div>
		</>
	)
})
