import { memo, useEffect, useRef } from 'react'
import { Editor, TLCommentThread, useContainer, usePassThroughWheelEvents, useTranslation, useValue } from 'tldraw'
import { CommentCard } from '../ui/comment-card'
import { CountBadge } from '../ui/count-badge'
import { useThreadComments } from './hooks'
import { useCommentingOptions } from './options'
import { pinStackKey } from './pin-stacking'
import { openStackId, openThreadId } from './state'
import { ThreadPreview, useMarkerPreview } from './thread-preview'
import { anchorPagePoint } from './thread-state'
import {
	POPOVER_OFFSET,
	ThreadPopover,
	ThreadView,
	ThreadViewHostProps,
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
	impreciseShapeAnchor,
	...props
}: ThreadViewHostProps & {
	editor: Editor
	/** The stack's threads, oldest first. All resolve to the same anchor point. */
	threads: readonly TLCommentThread[]
	impreciseShapeAnchor?: { x: number; y: number }
}) {
	const container = useContainer()
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
			const pagePoint = anchorPagePoint(editor, threads[0].anchor, impreciseShapeAnchor)
			return pagePoint ? pinStackKey(pagePoint) : threads[0].id
		},
		[editor, threads, impreciseShapeAnchor]
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
			// The badge is centered on its anchor point (transform: translate(-50%, -50%)), like the
			// cluster badge — so it sits at the raw page point with no pin inset. The inset only
			// compensates for the single pin's bottom-left anchoring; applying it here would offset
			// the badge from where the cluster badge sits and make it hop as pins flip between them.
			const pagePoint = anchorPagePoint(editor, first.anchor, impreciseShapeAnchor)
			return pagePoint ? editor.pageToViewport(pagePoint) : null
		},
		[editor, threads, impreciseShapeAnchor]
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

	return (
		<>
			<div className="tlui-cmt-canvas-pin" style={{ left: point.x, top: point.y }}>
				<button
					ref={badgeRef}
					type="button"
					className="tlui-cmt-canvas-stack-badge"
					// Without a name the badge announces as a bare number.
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
					container={container}
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
					container={container}
					style={{ left: point.x + POPOVER_OFFSET.list.x, top: point.y + POPOVER_OFFSET.list.y }}
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
}: ThreadViewHostProps & { editor: Editor; thread: TLCommentThread; onOpen(): void }) {
	const options = useCommentingOptions()
	const comments = useThreadComments(editor, thread.id)
	const resolveName = useResolveName(props.resolveAuthor)
	const first = comments[0]
	if (!first) return null
	return (
		// A card in the stack list opens its thread, so it's a control, not a div. The card's own
		// text is the accessible name — no aria-label, or it would shadow the comment itself.
		<button
			type="button"
			className="tlui-cmt-stack-list__card"
			onClick={(e) => {
				e.stopPropagation()
				onOpen()
			}}
		>
			<CommentCard {...toCardProps(first, props, options.components, resolveName)} />
		</button>
	)
}
