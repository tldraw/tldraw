import { type MouseEvent as ReactMouseEvent, memo, useEffect, useRef } from 'react'
import {
	Editor,
	TLCommentThread,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
} from 'tldraw'
import { CommentCard } from '../ui/comment-card'
import { CountBadge } from '../ui/count-badge'
import { UNKNOWN_AUTHOR } from './comment-render'
import { type CommentingContext } from './context'
import { useThreadComments } from './hooks'
import { useCommentingOptions } from './options'
import { pinStackKey } from './pin-stacking'
import { openStackId, openThreadId } from './state'
import { ThreadPreview, useMarkerPreview } from './thread-preview'
import { anchorPagePoint, impreciseShapePinInset } from './thread-state'
import {
	POPOVER_OFFSET,
	ThreadPopover,
	ThreadView,
	toCardProps,
	useResolveName,
} from './thread-view'

/**
 * The pin for threads whose anchors resolve to the same page point — pins zooming can never
 * separate, so instead of stacked markers they share one count badge. Clicking it opens a
 * popover listing each thread as a card; clicking a card expands that thread in place (via the
 * single open-thread state, so expanding one collapses another).
 */
export const ThreadStackPin = memo(function ThreadStackPin({
	editor,
	threads,
	...props
}: CommentingContext & {
	editor: Editor
	/** The stack's threads, oldest first. All resolve to the same anchor point. */
	threads: readonly TLCommentThread[]
}) {
	const msg = useTranslation()
	const badgeRef = useRef<HTMLButtonElement>(null)
	// The badge takes pointer events (to open on click), so wheel input over it would otherwise be
	// swallowed instead of zooming — pass it through to the canvas, as the pin and cluster badge do.
	usePassThroughWheelEvents(badgeRef)
	// Hovering the badge previews its threads; clicking still opens them as the interactive list.
	// The preview is what makes the badge legible before you commit to opening it.
	const { previewShown, previewHandlers } = useMarkerPreview(editor, `stack:${threads[0].id}`)
	// The list stays open while a member thread is expanded, and on its own after the member
	// collapses — so Escape steps back: expanded thread → card list → closed. Held in editor
	// state (not component state) because this pin remounts as its owning render path changes.
	// Keyed by the coincident page point, not a member id, so the open state survives losing a
	// member (including the oldest): the survivors keep the same key. Falls back to a thread id
	// only when the anchor can't resolve (off page), where the list isn't shown anyway.
	const stackId = useValue(
		'stack id',
		() => {
			const pagePoint = anchorPagePoint(editor, threads[0].anchor)
			return pagePoint ? pinStackKey(pagePoint) : threads[0].id
		},
		[editor, threads]
	)
	const listOpen = useValue('stack list open', () => openStackId.get(editor) === stackId, [
		editor,
		stackId,
	])
	const openId = useValue('open thread id', () => openThreadId.get(editor), [editor])
	const openMember = threads.find((thread) => thread.id === openId)
	const open = listOpen || openMember !== undefined

	const point = useValue(
		'stack point',
		() => {
			const first = threads[0]
			if (first.pageId !== editor.getCurrentPageId()) return null
			// The badge hangs off its anchor point bottom-left (transform: translate(0, -100%)),
			// like a pin — and it applies the same imprecise-shape inset the pins it stands in for
			// would (see ThreadPin): the stack's members share one anchor point, so they share one
			// inset, and skipping it would snap the marker from tucked inside the shape to the raw
			// corner the moment a second imprecise comment turns a pin into a stack. The cluster
			// badge matches by drawing at the centroid of the pins as rendered.
			const pagePoint = anchorPagePoint(editor, first.anchor)
			if (!pagePoint) return null
			const viewportPoint = editor.pageToViewport(pagePoint)
			const inset = impreciseShapePinInset(editor, first.anchor)
			return inset ? { x: viewportPoint.x + inset.x, y: viewportPoint.y + inset.y } : viewportPoint
		},
		[editor, threads]
	)

	// Clicking outside the popover (and off the badge) closes the whole stack — mirrors the
	// single pin's dismiss. Capture phase + class checks, since the popover portals elsewhere.
	useEffect(() => {
		if (!open) return
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement | null
			if (!target) return
			if (target.closest('.tlui-cmt-canvas-popover')) return
			const badge = badgeRef.current
			if (badge && badge.contains(target)) return
			// A click inside a menu/popover layered above us belongs to that layer; defer to its
			// own dismissal instead of closing the stack out from under it.
			if (
				target.closest('.tlui-menu, [data-radix-popper-content-wrapper], .tlui-cmt-mention-popup')
			)
				return
			openStackId.set(editor, null)
			openThreadId.set(editor, null)
		}
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => document.removeEventListener('pointerdown', onPointerDown, true)
	}, [open, editor])

	// Escape with only the card list showing closes it. When a member thread is expanded, the
	// layer's Escape handler collapses that first and marks the event consumed — stepping back
	// to the list rather than closing everything at once.
	useEffect(() => {
		if (!listOpen) return
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || e.defaultPrevented) return
			openStackId.set(editor, null)
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [listOpen, editor])

	if (!point) return null

	const toggle = () => {
		if (open) {
			openStackId.set(editor, null)
			openThreadId.set(editor, null)
		} else {
			openStackId.set(editor, stackId)
		}
	}

	// The expanded thread gains a "Comment" header that pushes its first comment down from where the
	// hover preview showed it. When that thread is the list's first, lift the whole list by the
	// header block so its "You" holds position across hover -> open: the single thread's
	// THREAD_HEADER_BLOCK (36) plus the 8px margin above the expanded entry, less the 2px top the
	// preview card sits its "You" down by. Only the first entry — lifting the list can't also hold a
	// lower thread's neighbours in place.
	const liftForHeader = threads[0]?.id === openId ? 42 : 0

	return (
		<>
			<div className="tlui-cmt-canvas-pin" style={{ left: point.x, top: point.y }}>
				<button
					ref={badgeRef}
					type="button"
					className="tlui-cmt-button tlui-cmt-canvas-stack-badge"
					aria-label={msg('comments.stack-label').replace('{count}', String(threads.length))}
					aria-expanded={open}
					onPointerDown={(e) => e.stopPropagation()}
					onClick={(e) => {
						e.stopPropagation()
						toggle()
					}}
					{...previewHandlers}
					onFocus={previewHandlers.onPointerEnter}
					onBlur={previewHandlers.onPointerLeave}
				>
					<CountBadge count={threads.length} open={open} />
				</button>
			</div>
			{previewShown && !open && (
				<ThreadPreview
					editor={editor}
					threads={threads}
					// Lines the preview up with the stack list itself, so opening it leaves the cards
					// exactly where the preview had them.
					variant="list"
					point={point}
					// Picking a card from the preview lands in the same place clicking the badge and
					// then the card would: the list open, that thread expanded within it.
					onSelectThread={(thread) => {
						openStackId.set(editor, stackId)
						openThreadId.set(editor, thread.id)
					}}
					{...previewHandlers}
					currentUserId={props.currentUserId}
					resolveAuthor={props.resolveAuthor}
				/>
			)}
			{open && (
				<ThreadPopover
					style={{
						left: point.x + POPOVER_OFFSET.list.x,
						top: point.y + POPOVER_OFFSET.list.y - liftForHeader,
					}}
				>
					<div className="tlui-cmt-stack-list">
						{threads.map((thread) =>
							thread.id === openId ? (
								<div key={thread.id} className="tlui-cmt-stack-list__thread">
									<ThreadView editor={editor} thread={thread} {...props} />
								</div>
							) : (
								<StackThreadCard
									key={thread.id}
									editor={editor}
									thread={thread}
									{...props}
									onOpen={() => openThreadId.set(editor, thread.id)}
								/>
							)
						)}
					</div>
				</ThreadPopover>
			)}
		</>
	)
})

/** A collapsed stack entry: the thread's first comment as a card; clicking expands the thread. */
function StackThreadCard({
	editor,
	thread,
	onOpen,
	...props
}: CommentingContext & { editor: Editor; thread: TLCommentThread; onOpen(): void }) {
	const msg = useTranslation()
	const options = useCommentingOptions()
	const comments = useThreadComments(editor, thread.id)
	const resolveName = useResolveName(props.resolveAuthor)
	const first = comments[0]
	if (!first) return null
	const open = (e: ReactMouseEvent) => {
		e.stopPropagation()
		onOpen()
	}
	return (
		<div className="tlui-cmt-stack-list__card" onClick={open}>
			{/* The card's keyboard affordance. A button *wrapping* the card would put the comment
			    body inside it, and a body renders its links as real anchors — interactive content
			    nested in a button, which is an invalid content model and reads to assistive tech as a
			    broken control. So the button covers the card as a sibling instead, leaving the body's
			    own links above it and still reachable. */}
			<button
				type="button"
				className="tlui-cmt-button tlui-cmt-stack-list__card-action"
				aria-label={msg(
					thread.resolved ? 'comments.pin-label-resolved' : 'comments.pin-label'
				).replace('{name}', props.resolveAuthor(thread.createdBy)?.name ?? UNKNOWN_AUTHOR)}
				onClick={open}
			/>
			<CommentCard {...toCardProps(first, props, options.components, resolveName)} />
		</div>
	)
}
