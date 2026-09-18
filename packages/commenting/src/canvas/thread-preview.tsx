import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Editor, EditorAtom, TLComment, TLCommentThread, useTranslation, useValue } from 'tldraw'
import { CommentCard } from '../ui/comment-card'
import { useComments } from './hooks'
import { useCommentingOptions } from './options'
import { openStackId, openThreadId } from './state'
import { ThreadViewHostProps, toCardProps } from './thread-view'

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

/**
 * Where a preview sits relative to its marker's anchor point, per what replaces it on click. Both
 * share the popovers' horizontal offset, so only the vertical differs — the point is that clicking
 * swaps the panel without the comment text moving under the pointer.
 *
 * `thread` is measured against an opened thread popover, whose first card sits below the thread
 * header: popover top (-28) + thread padding (8) + header (2 + 22 + 2) + column gap (6) + the
 * card's own top padding (6) puts the text at +18. A preview card's text sits 10px below the
 * panel top (its padding), so the panel starts at +8.
 *
 * `list` is measured against the stack list, which has no header: its popover top (-28) and its
 * cards' 10px padding put the text at -18, so a preview using the same 10px padding starts at -28
 * — the same place the list itself does.
 */
export const PREVIEW_OFFSET = {
	/** For a marker whose click opens a thread popover (a single pin). */
	thread: { x: 36, y: 8 },
	/** For a marker whose click opens a list of cards (a coincident stack), or nothing (a cluster). */
	list: { x: 36, y: -28 },
} as const

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
	style,
	onSelectThread,
	onPointerEnter,
	onPointerLeave,
	...props
}: Pick<ThreadViewHostProps, 'currentUserId' | 'resolveName'> & {
	editor: Editor
	/** The marker's threads, in the order they should read (oldest first). */
	threads: readonly TLCommentThread[]
	container: HTMLElement
	style: CSSProperties
	/** Open a thread from its card. Omit to leave the cards inert. */
	onSelectThread?(thread: TLCommentThread): void
	/** The owning marker's hover handlers, so the panel counts as part of its hover region. */
	onPointerEnter?(): void
	onPointerLeave?(): void
}) {
	const options = useCommentingOptions()
	const msg = useTranslation()
	const comments = useComments(editor)

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

	const visible = threads.slice(0, PREVIEW_MAX_THREADS)
	const overflow = threads.length - visible.length

	return createPortal(
		<div
			className="tlui-cmt-canvas-preview"
			style={style}
			onPointerEnter={onPointerEnter}
			onPointerLeave={onPointerLeave}
			// The panel sits over the canvas; a press on it is not a canvas press.
			onPointerDown={(e) => e.stopPropagation()}
		>
			{visible.map((thread) => {
				const first = firstByThread.get(thread.id)
				// A thread whose comments haven't arrived yet (a collaborator's, mid-sync) has nothing
				// to preview — skip the card rather than render an empty one.
				if (!first) return null
				return (
					<div
						key={thread.id}
						className={
							onSelectThread
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
						<CommentCard {...toCardProps(first, props, options.components)} />
					</div>
				)
			})}
			{overflow > 0 && (
				<div className="tlui-cmt-preview-more">
					{msg('comments.preview-more').replace('{count}', String(overflow))}
				</div>
			)}
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
