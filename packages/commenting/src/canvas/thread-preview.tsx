import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import {
	Editor,
	EditorAtom,
	EditorPortal,
	TLComment,
	TLCommentThread,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
} from 'tldraw'
import { CommentCard } from '../ui/comment-card'
import { replyCountLabel } from '../ui/reply-count'
import { type CommentingContext } from './context'
import { useComments } from './hooks'
import { useCommentingOptions } from './options'
import { openStackId, openThreadId } from './state'
import { POPOVER_OFFSET, toCardProps, useResolveName } from './thread-view'

/**
 * Hover previews for every canvas marker — a single pin, a coincident stack, or a cluster badge.
 * Hovering shows the thread(s) behind the marker as cards; the marker's own click is unchanged.
 *
 * The panel is live, not a passive tooltip: the pointer can travel into it and click a card to open
 * that thread. Two pieces make that work — the close delay survives the trip across the gap, and
 * the panel carries an invisible bridge over it (see `.tlui-cmt-canvas-preview::before`).
 *
 * Opening a thread from a card needs nothing more than setting `openThreadId`, even for one folded
 * inside a badge: `collectClusterLeaves` skips the open thread, so it drops out and renders itself.
 */

/** How long the pointer must rest on a marker before its preview appears. */
const PREVIEW_OPEN_DELAY_MS = 180
/**
 * Grace period after the pointer leaves the marker *or* the panel — long enough to cross the gap
 * between them, which the bridge element covers geometrically.
 */
const PREVIEW_CLOSE_DELAY_MS = 220
/** Cards shown before the panel falls back to a "+N more" line. */
const PREVIEW_MAX_THREADS = 5

/** A thread paired with the comment that opens it — one card of a preview. */
export interface ThreadPreviewCard {
	thread: TLCommentThread
	first: TLComment
}

/**
 * The cards a marker's preview will show, and how many threads it will summarise as "+N more".
 *
 * A thread can exist before its opening comment does — a collaborator's, mid-sync. Those are
 * dropped rather than rendered blank, and don't count toward the overflow tally.
 */
export function selectPreviewCards(
	threads: readonly TLCommentThread[],
	firstCommentOf: (thread: TLCommentThread) => TLComment | undefined,
	max = PREVIEW_MAX_THREADS
): { cards: ThreadPreviewCard[]; overflow: number } {
	const readable: ThreadPreviewCard[] = []
	for (const thread of threads) {
		const first = firstCommentOf(thread)
		if (first) readable.push({ thread, first })
	}
	return { cards: readable.slice(0, max), overflow: Math.max(0, readable.length - max) }
}

/**
 * What a marker's click opens, which is what its preview imitates — the panel's surface, its
 * width, and how it lays a comment out.
 *
 * `'thread'` previews a single pin: a thread panel without the header. `'list'` previews a
 * coincident stack or a cluster: one card per thread, like the stack list.
 */
export type ThreadPreviewVariant = 'thread' | 'list'

/**
 * Which marker's preview is showing, or null. One atom for the whole layer, so previews are
 * mutually exclusive: the close delay can leave an outgoing marker's timer pending when the next
 * opens, and per-component state would briefly show both.
 */
const hoveredMarkerId = new EditorAtom<string | null>('commentHoveredMarkerId', () => null)

/**
 * Hover state for one marker. Returns whether its preview should render, plus the pointer handlers
 * to spread onto the marker element. `markerId` must be stable and unique per marker across the
 * layer — prefix by kind, or a stack collides with its oldest member's own pin.
 */
export function useMarkerPreview(editor: Editor, markerId: string) {
	const openTimer = useRef(0)
	const closeTimer = useRef(0)

	// Previews are a resting-state affordance. While a thread or stack list is open, that view is
	// the thing being read — a preview floating over it would just compete with it.
	const suppressed = useValue(
		'marker preview suppressed',
		() => openThreadId.get(editor) !== null || openStackId.get(editor) !== null,
		[editor]
	)
	const shown = useValue('marker preview shown', () => hoveredMarkerId.get(editor) === markerId, [
		editor,
		markerId,
	])

	useEffect(() => {
		const open = openTimer
		const close = closeTimer
		return () => {
			window.clearTimeout(open.current)
			window.clearTimeout(close.current)
			// Don't strand the atom on a marker that has unmounted — zoomed into a cluster, deleted,
			// or folded away — or no other marker's preview could ever show.
			if (hoveredMarkerId.get(editor) === markerId) hoveredMarkerId.set(editor, null)
		}
	}, [editor, markerId])

	// Suppression can start *while* a preview is up: clicking the hovered pin opens its thread.
	// Retract the preview rather than leaving it stranded behind the popover that just opened.
	useEffect(() => {
		if (suppressed && hoveredMarkerId.get(editor) === markerId) {
			hoveredMarkerId.set(editor, null)
		}
	}, [suppressed, editor, markerId])

	const onPointerEnter = () => {
		window.clearTimeout(openTimer.current)
		window.clearTimeout(closeTimer.current)
		if (suppressed) return
		openTimer.current = window.setTimeout(
			() => hoveredMarkerId.set(editor, markerId),
			PREVIEW_OPEN_DELAY_MS
		)
	}

	const onPointerLeave = () => {
		window.clearTimeout(openTimer.current)
		window.clearTimeout(closeTimer.current)
		closeTimer.current = window.setTimeout(() => {
			if (hoveredMarkerId.get(editor) === markerId) hoveredMarkerId.set(editor, null)
		}, PREVIEW_CLOSE_DELAY_MS)
	}

	return {
		previewShown: shown && !suppressed,
		previewHandlers: { onPointerEnter, onPointerLeave },
	}
}

/**
 * The hover panel: each thread's opening comment as a read-only card, capped with a "+N more" line.
 * Mounted only while hovering, so its store subscription costs nothing at rest.
 */
export function ThreadPreview({
	editor,
	threads,
	variant,
	point,
	onSelectThread,
	onPointerEnter,
	onPointerLeave,
	...props
}: Pick<CommentingContext, 'currentUserId' | 'resolveAuthor'> & {
	editor: Editor
	/** The marker's threads, in the order they should read (oldest first). */
	threads: readonly TLCommentThread[]
	/** What the marker's click opens, which this panel imitates. */
	variant: ThreadPreviewVariant
	/** The marker's anchor point in viewport space — the same origin its popover is placed from. */
	point: { x: number; y: number }
	/** Open a thread from its card. Omit to leave the cards inert. */
	onSelectThread?(thread: TLCommentThread): void
	/** The owning marker's hover handlers, so the panel counts as part of its hover region. */
	onPointerEnter?(): void
	onPointerLeave?(): void
}) {
	const options = useCommentingOptions()
	const msg = useTranslation()
	const comments = useComments(editor)
	const resolveName = useResolveName(props.resolveAuthor)

	// The panel floats over the canvas and scrolls nothing of its own, so a wheel on it should zoom
	// and pan the canvas underneath — like every other tldraw panel, and like the popover it
	// previews. Without this the canvas would freeze wherever the preview happened to be.
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	// Each thread's opening comment and its total comment count. `useComments` is oldest-first, so
	// the first hit per thread is that thread's first comment. One pass over every comment beats a
	// per-thread hook — the thread count here is driven by cluster size, which has no fixed bound.
	const { firstByThread, countByThread } = useMemo(() => {
		const first = new Map<string, TLComment>()
		const count = new Map<string, number>()
		for (const comment of comments) {
			if (!first.has(comment.threadId)) first.set(comment.threadId, comment)
			count.set(comment.threadId, (count.get(comment.threadId) ?? 0) + 1)
		}
		return { firstByThread: first, countByThread: count }
	}, [comments])

	const { cards, overflow } = useMemo(
		() => selectPreviewCards(threads, (thread) => firstByThread.get(thread.id)),
		[threads, firstByThread]
	)

	// Nothing readable yet — render no panel rather than an empty one. It matters most for the
	// thread variant, where the panel *is* the card's surface: an empty one would paint as a blank
	// box floating on the canvas.
	if (cards.length === 0) return null

	// Placed at the same origin as the popover this previews, so the two only differ by what their
	// stylesheets do — see `.tlui-cmt-canvas-preview__panel--thread` for the header compensation.
	const offset = POPOVER_OFFSET[variant]
	// A thread preview is one comment on the panel itself, so the panel carries the hover and the
	// click. A list preview puts each thread on its own card, as the stack list does.
	const isThread = variant === 'thread'
	const panelClass = [
		'tlui-cmt-canvas-preview__panel',
		`tlui-cmt-canvas-preview__panel--${variant}`,
		isThread && onSelectThread ? 'tlui-cmt-canvas-preview__panel--selectable' : '',
	]
		.filter(Boolean)
		.join(' ')

	return (
		<EditorPortal>
			{/* The root is the hover region — it carries the bridge back to the marker — while the panel
		    inside it is the visible surface. Keeping them apart is what lets the surface light up on
		    its own hover without the bridge (which reaches back over the marker) lighting it up too. */}
			<div
				ref={ref}
				className={`tlui-cmt-canvas-preview tlui-cmt-canvas-preview--${variant}`}
				style={
					{
						left: point.x + offset.x,
						top: point.y + offset.y,
						// The stylesheet sizes the hover bridge against this, so the gap it spans follows
						// the offset rather than being restated as a second magic number.
						'--tlui-cmt-preview-offset': `${offset.x}px`,
					} as CSSProperties
				}
				onPointerEnter={onPointerEnter}
				onPointerLeave={onPointerLeave}
				// The panel sits over the canvas; a press on it is not a canvas press.
				onPointerDown={(e) => e.stopPropagation()}
			>
				<div className={panelClass}>
					{cards.map(({ thread, first }) => {
						// The preview shows only the opening comment, so its reply count is what tells the
						// reader the thread continues past what they see.
						const replies = replyCountLabel(msg, (countByThread.get(thread.id) ?? 1) - 1)
						return (
							<div
								key={thread.id}
								className={
									isThread
										? undefined
										: onSelectThread
											? 'tlui-cmt-preview-card tlui-cmt-preview-card--selectable'
											: 'tlui-cmt-preview-card'
								}
								onClick={
									onSelectThread
										? (e) => {
												e.stopPropagation()
												onSelectThread(thread)
											}
										: undefined
								}
							>
								<CommentCard
									{...toCardProps(first, props, options.components, resolveName)}
									footer={
										replies ? <span className="tlui-cmt-card__replies">{replies}</span> : undefined
									}
								/>
							</div>
						)
					})}
					{overflow > 0 && (
						<div className="tlui-cmt-preview-more">
							{msg('comments.preview-more').replace('{count}', String(overflow))}
						</div>
					)}
				</div>
			</div>
		</EditorPortal>
	)
}

/** Order a marker's threads for reading: oldest first, id as the tiebreak so it's stable. */
export function sortThreadsForPreview(
	threads: readonly TLCommentThread[]
): readonly TLCommentThread[] {
	return [...threads].sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1))
}
