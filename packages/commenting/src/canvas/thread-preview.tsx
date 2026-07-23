import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Editor, EditorAtom, TLComment, TLCommentThread, useTranslation, useValue } from 'tldraw'
import { CommentCard } from '../ui/comment-card'
import { useComments } from './hooks'
import { useCommentingOptions } from './options'
import { openStackId, openThreadId } from './state'
import { POPOVER_OFFSET, ThreadViewHostProps, toCardProps, useResolveName } from './thread-view'

/**
 * Hover previews for every canvas marker — a single pin, a coincident stack, or a cluster badge.
 * Hovering shows the thread(s) behind the marker as cards; the marker's own click keeps whatever
 * it already did (open the thread, open the stack list, zoom to the cluster's split).
 *
 * The panel is live, not a passive tooltip: the pointer can travel right into it and hover each
 * card, and clicking one opens that thread — the same affordance the stack list gives its cards.
 * Two pieces make that work. The close delay survives the trip across the gap, and the panel
 * carries an invisible bridge over that gap (see `.tlui-cmt-canvas-preview::before`) so the
 * journey never crosses dead space and retracts the panel mid-move.
 *
 * Opening a thread from a card needs nothing more than setting `openThreadId`, including for a
 * thread currently folded inside a cluster badge: `collectClusterLeaves` skips the open thread, so
 * it drops out of its badge and renders its own pin and popover.
 */

/** How long the pointer must rest on a marker before its preview appears. */
const PREVIEW_OPEN_DELAY_MS = 180
/**
 * Grace period after the pointer leaves the marker *or* the panel. Long enough to cross the gap
 * between them by hand — the bridge element covers that gap geometrically, and this covers the
 * moment of transit between the two elements' enter/leave events.
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
 * A thread can exist before its opening comment does — a collaborator's, mid-sync — and has nothing
 * to preview until it arrives. Those are dropped here rather than rendered as blank cards, and they
 * don't count toward the overflow tally either, so "+2 more" always means two readable threads.
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
 * mutually exclusive by construction: the close delay means an outgoing marker's timer can still
 * be pending when the next marker opens, and per-component state would briefly show both.
 */
const hoveredMarkerId = new EditorAtom<string | null>('commentHoveredMarkerId', () => null)

/**
 * Hover state for one marker. Returns whether its preview should render, plus the pointer handlers
 * to spread onto the marker element.
 *
 * `markerId` must be stable and unique per marker across the layer — prefix by kind, since a stack
 * is keyed by its oldest member's thread id and would otherwise collide with that thread's own pin.
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
 * The hover panel: each thread's opening comment as a read-only card, capped with a "+N more"
 * line. Mounted only while hovering, so the store subscription it needs to find those comments
 * costs nothing at rest.
 */
export function ThreadPreview({
	editor,
	threads,
	container,
	variant,
	point,
	onSelectThread,
	onPointerEnter,
	onPointerLeave,
	...props
}: Pick<ThreadViewHostProps, 'currentUserId' | 'resolveAuthor'> & {
	editor: Editor
	/** The marker's threads, in the order they should read (oldest first). */
	threads: readonly TLCommentThread[]
	container: HTMLElement
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

	// Each thread's opening comment. `useComments` is oldest-first, so the first hit per thread is
	// that thread's first comment. One pass over every comment beats a per-thread hook — the
	// thread count here is driven by cluster size, which has no fixed bound.
	const firstByThread = useMemo(() => {
		const first = new Map<string, TLComment>()
		for (const comment of comments) {
			if (!first.has(comment.threadId)) first.set(comment.threadId, comment)
		}
		return first
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

	return createPortal(
		// The root is the hover region — it carries the bridge back to the marker — while the panel
		// inside it is the visible surface. Keeping them apart is what lets the surface light up on
		// its own hover without the bridge (which reaches back over the marker) lighting it up too.
		<div
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
				{cards.map(({ thread, first }) => (
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
						<CommentCard {...toCardProps(first, props, options.components, resolveName)} />
					</div>
				))}
				{overflow > 0 && (
					<div className="tlui-cmt-preview-more">
						{msg('comments.preview-more').replace('{count}', String(overflow))}
					</div>
				)}
			</div>
		</div>,
		container
	)
}

/** Order a marker's threads for reading: oldest first, id as the tiebreak so it's stable. */
export function sortThreadsForPreview(
	threads: readonly TLCommentThread[]
): readonly TLCommentThread[] {
	return [...threads].sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1))
}
