import { type CommentAuthor, isMentionPickerOpen, MentionMember } from '@tldraw/mentions'
import {
	memo,
	type CSSProperties,
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
	createComment,
	createCommentThread,
	Editor,
	getFirstCharacter,
	react,
	TLComment,
	TLCommentId,
	TLCommentThread,
	TLRichText,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiIcon,
	useContainer,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
} from 'tldraw'
import { computeClusterTable } from '../clustering/computeClusterTable'
import { type ClusterRuntime, createClusterRuntime } from '../clustering/runtime'
import type { ClusterNode, ClusterTable, MergeEvent } from '../clustering/types'
import { CommentCard, CommentCardProps } from '../ui/comment-card'
import { CommentComposer } from '../ui/comment-composer'
import { EMPTY_COMMENT, isCommentEmpty } from '../ui/comment-extensions'
import { CommentPin } from '../ui/comment-pin'
import { CommentThread } from '../ui/comment-thread'
import { TooltipButton } from '../ui/tooltip-button'
import { registerCommentAnchorLifecycle } from './anchor-lifecycle'
import { collectClusterLeaves } from './cluster-input'
import { CommentBody } from './comment-body'
import {
	clearCommentDraft,
	getCommentDraft,
	NEW_COMMENT_DRAFT,
	replyDraftSlot,
	saveCommentDraft,
} from './comment-drafts'
import { UNKNOWN_AUTHOR, UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { getCommentRecord, putCommentRecords, removeCommentRecords } from './comment-store'
import { PendingComment } from './comment-tool'
import { useCommentThreads, useThreadComments } from './hooks'
import { useCommentingEnabled } from './license'
import {
	type CommentingComponents,
	type CommentingOptions,
	useCanComment,
	useCommentingOptions,
} from './options'
import {
	clusterExpandRequest,
	commentPinDisplay,
	commentPinDrag,
	commentRegionEdit,
	type CommentPinDisplayBadge,
	type CommentPinDisplayPin,
} from './pin-overlay'
import {
	commentsHidden,
	commitCommentMutation,
	openThreadId,
	pendingComment,
	revealThreadRequest,
	toggleCommentsHidden,
	usePendingComment,
} from './state'
import {
	anchorPagePoint,
	DEFAULT_IMPRECISE_SHAPE_ANCHOR,
	impreciseShapePinInset,
	regionAnchorPinCorner,
	regionPinPoint,
} from './thread-state'

/**
 * A ready-to-use comments layer for a tldraw canvas: pins each thread at its anchor, opens a
 * thread popover (with a reply composer) on click, and shows a composer where the comment tool
 * placed a new thread. Reads/writes comment records straight from `editor.store`.
 *
 * It's meant as the batteries-included default — every visible piece is a lever (the `CommentBody`
 * and `PinContent` slots on `CommentTool.configure({ components })`), and the pieces it composes
 * (`CommentPin`, `CommentThread`, `CommentComposer`, the hooks, the tool) are all exported, so a
 * consumer can rebuild this from parts instead.
 * @public
 */
export interface CanvasCommentsProps {
	/** The signed-in user's id, or null for a read-only viewer. Only a signed-in user composes. */
	currentUserId: string | null
	/** Map an author id to their display info, or `undefined` when the id can't be resolved. */
	resolveAuthor(id: string): CommentAuthor | undefined
	/** Called after any comment (a new thread's first comment, or a reply) is posted. */
	onPostComment?(comment: TLComment): void
	/** Whether a comment is unread for the current user (return true for unread). */
	isCommentUnread?(commentId: TLCommentId): boolean
	/**
	 * Called for each unread comment shown to the user in an open thread popover, so hosts can
	 * record a read receipt. Needs `isCommentUnread` to know what's unread.
	 */
	onCommentRead?(commentId: TLCommentId): void
	/** Resolve the members matching an `@`-query in the composers (sync or async). */
	getMentionSuggestions?(query: string): MentionMember[] | Promise<MentionMember[]>
	/** Override a mention-picker row's content. */
	renderMentionSuggestion?(member: MentionMember): ReactNode
	/** Where imprecise shape pins sit — a normalized (0–1) spot within the shape. Default top-right. */
	impreciseShapeAnchor?: { x: number; y: number }
}

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

const initialOf = (name: string): string => (getFirstCharacter(name.trim()) || '?').toUpperCase()
/** Duration of the click-a-badge zoom-to-split animation. */
const CLUSTER_EXPAND_ZOOM_MS = 450

/** The leading element for the placement composer — the comment pin's shape, but a pencil
 *  instead of an initial, marking an unsent draft. */
const draftAvatar = (color?: string) => (
	<CommentPin color={color}>
		<svg
			viewBox="0 0 24 24"
			width="15"
			height="15"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12 20h9" />
			<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
		</svg>
	</CommentPin>
)

function toCardProps(
	comment: TLComment,
	props: CanvasCommentsProps,
	components: CommentingComponents,
	resolveName: (id: string) => string | undefined
): CommentCardProps {
	const Body = components.CommentBody
	// The `CommentBody` component slot overrides the built-in rich-text default (which resolves
	// mention ids to names).
	const body = Body ? (
		<Body comment={comment} />
	) : (
		<CommentBody richText={comment.body} resolveName={resolveName} />
	)
	return {
		author: props.resolveAuthor(comment.authorId) ?? UNKNOWN_COMMENT_AUTHOR,
		body,
		date: new Date(comment.createdAt).toISOString(),
		you: comment.authorId === props.currentUserId,
		edited: comment.editedAt != null,
	}
}

/** @public @react */
export function CanvasComments(props: CanvasCommentsProps) {
	// Gate the whole layer on the license before doing any work. The inner component holds all the
	// other hooks, so mounting/unmounting it as the license resolves keeps hook order stable here.
	const commentingEnabled = useCommentingEnabled()
	if (!commentingEnabled) return null
	return <CanvasCommentsLayer {...props} />
}

function CanvasCommentsLayer(props: CanvasCommentsProps) {
	const editor = useEditor()
	const options = useCommentingOptions()
	const container = useContainer()
	const layerRef = useRef<HTMLDivElement>(null)
	// Over the pins and cluster badges, hover passes through to the canvas beneath (these events
	// bubble up from the pointer-interactive markers to this layer root). Wheel pass-through is
	// NOT on this root: it lives on each interactive element instead. The root spans the whole
	// canvas, so any pin past its bottom/right edge inflates the root's scrollHeight — which the
	// wheel hook's is-this-scrollable guard reads as scrollable, silently disabling pass-through.
	usePassThroughMouseOverEvents(layerRef)
	const threads = useCommentThreads(editor)
	const pending = usePendingComment()
	const canComment = useCanComment(props.currentUserId)
	// With composing blocked and no fallback slot there's nothing to render for a pending comment —
	// and the dismiss handlers (Escape, click-away) live inside PendingComposer, which would never
	// mount. Clear the atom instead of stranding it (a stale pending would pop a composer at the
	// old click point if `canComment` later flips true).
	const canRenderComposer = canComment || options.components.ComposerFallback != null
	const showPendingComposer = pending != null && canRenderComposer
	useEffect(() => {
		if (pending && !showPendingComposer) pendingComment.set(editor, null)
	}, [editor, pending, showPendingComposer])
	const openId = useValue('open thread id', () => openThreadId.get(editor), [editor])
	const impreciseShapeAnchor = props.impreciseShapeAnchor ?? options.impreciseShapeAnchor
	// Keyed by the anchor's values, not its identity — an inline `impreciseShapeAnchor` prop is a
	// new object every render and would re-register the handlers each time.
	const { x: impreciseX, y: impreciseY } = impreciseShapeAnchor
	useEffect(
		() => registerCommentAnchorLifecycle(editor, { x: impreciseX, y: impreciseY }),
		[editor, impreciseX, impreciseY]
	)
	// Threads held out of clustering because their anchor moved while folded inside a badge
	// (drag, nudge, align, undo, a collaborator — detected by position, not gesture). They render
	// as live pins riding their anchor and rejoin clustering on the next zoom-out.
	const [heldThreadIds, setHeldThreadIds] = useState<ReadonlySet<string>>(EMPTY_SET)
	const adoptOnRebuild = useRef(false)
	const clusterLeaves = useValue(
		'comment cluster leaves',
		() =>
			collectClusterLeaves(
				editor,
				threads.filter((thread) => !heldThreadIds.has(thread.id)),
				openThreadId.get(editor),
				impreciseShapeAnchor
			),
		[editor, threads, impreciseShapeAnchor, heldThreadIds]
	)
	const clusterZoomBounds = useValue(
		'comment cluster zoom bounds',
		() => getClusterZoomBounds(editor),
		[editor]
	)
	const latestModel = useMemo(() => {
		const table = computeClusterTable(clusterLeaves, clusterZoomBounds)
		const runtime = createClusterRuntime(table)
		runtime.seed(editor.getZoomLevel())
		return { runtime, table }
	}, [clusterLeaves, clusterZoomBounds, editor])
	// The core invariant: the only thing that re-flows clustering doc-wide is zoom. Every rebuild
	// (add / move / delete / open / pop-out) is computed immediately as `latestModel` — the MST
	// stays correct — but the on-screen partition is `renderedModel`, and it only ever changes via
	// (a) the cursor walking on zoom, (b) adoption of the pending rebuild on zoom-out, or
	// (c) LOCAL detach patches: a leaf that left the input (deleted, opened, popped out) is
	// detached from its own badge in place — count and centroid update for that badge alone,
	// and nothing else on the canvas moves.
	const [renderedModel, setRenderedModel] = useState(latestModel)
	let clusterModel = renderedModel
	// A page switch replaces the whole scene: hard-reset rather than detach the world.
	const pageId = useValue('comment cluster page', () => editor.getCurrentPageId(), [editor])
	const pageRef = useRef(pageId)
	if (pageRef.current !== pageId) {
		pageRef.current = pageId
		adoptOnRebuild.current = false
		latestModel.runtime.seed(editor.getZoomLevel())
		if (heldThreadIds.size > 0) setHeldThreadIds(EMPTY_SET)
		setRenderedModel(latestModel)
		clusterModel = latestModel
	}
	// adoptOnRebuild is set by the rejoin reaction below, outside React's render cycle, paired
	// with clearing heldThreadIds. Only trust it once that pairing is actually visible here
	// (heldThreadIds confirmed empty) — an unrelated re-render can land in the gap between the
	// ref being set and the state update it was paired with being applied.
	const rejoinPending = heldThreadIds.size === 0 && adoptOnRebuild.current
	if (renderedModel !== latestModel && rejoinPending) {
		adoptOnRebuild.current = false
		// Carryover seed: band events inherit the outgoing partition's merged/unmerged state, so
		// nothing changes state because of the swap alone. Idempotent, so safe during render.
		latestModel.runtime.seedFrom(editor.getZoomLevel(), renderedModel.runtime.getVisible())
		setRenderedModel(latestModel)
		clusterModel = latestModel
	} else if (heldThreadIds.size === 0 && renderedModel === latestModel) {
		// Nothing pending and nothing to adopt: clear any leftover force-adopt intent so it can't
		// survive to force-adopt a later, unrelated rebuild.
		adoptOnRebuild.current = false
	}
	// Pop-out detection: a leaf folded inside a badge can't follow its anchor (the badge position
	// is baked into the model), so when its live position drifts from the baked one, hold it out.
	// It renders as a live pin riding the anchor; the detach loop below shrinks its badge locally.
	const newlyMovedIds = findMovedClusteredLeafIds(clusterModel, latestModel)
	if (newlyMovedIds.length > 0) {
		const next = new Set(heldThreadIds)
		for (const id of newlyMovedIds) next.add(id)
		setHeldThreadIds(next)
	}
	// Local partition maintenance — the only non-zoom visual change, and it is local by
	// construction: any displayed leaf that has left the cluster input (deleted, thread opened,
	// popped out above) is detached from its badge in place. The corrected rebuild is already
	// sitting in latestModel awaiting the next zoom-out.
	{
		const latestLeafIds = new Set(latestModel.table.leaves.map((leaf) => leaf.id))
		for (const leaf of clusterModel.table.leaves) {
			if (!latestLeafIds.has(leaf.id)) {
				clusterModel.runtime.detachLeaf(leaf.id)
			}
		}
	}
	// Moved pins rejoin clustering on the next zoom-out motion: clear the set (so the rebuild
	// includes them again) and adopt that rebuild immediately instead of deferring it. Zooming in
	// never folds pins into clusters — merging is a zoom-out-only move, matching the runtime.
	useEffect(() => {
		if (heldThreadIds.size === 0) return
		let lastZoom = editor.getZoomLevel()
		return react('rejoin moved comment pins on zoom out', () => {
			const zoom = editor.getZoomLevel()
			const prevZoom = lastZoom
			lastZoom = zoom
			if (zoom >= prevZoom) return
			adoptOnRebuild.current = true
			setHeldThreadIds(EMPTY_SET)
		})
	}, [heldThreadIds, editor])
	// Adopt a pending rebuild only on zoom-out motion: folding deferred additions into clusters is
	// a merge, and merging only happens while zooming out. While zooming in, the stale table still
	// splits correctly on its own (split thresholds are direction-safe by the hysteresis invariant).
	useEffect(() => {
		if (clusterModel === latestModel) return
		let lastZoom = editor.getZoomLevel()
		return react('adopt pending cluster model on zoom out', () => {
			const zoom = editor.getZoomLevel()
			const prevZoom = lastZoom
			lastZoom = zoom
			if (zoom >= prevZoom) return
			latestModel.runtime.seedFrom(zoom, clusterModel.runtime.getVisible())
			setRenderedModel(latestModel)
		})
	}, [clusterModel, latestModel, editor])
	// Threads in the current input that the displayed partition doesn't show anywhere (new
	// comments, reopened threads, undone deletions): render as plain pins until the next
	// zoom-out folds them in. Membership is judged against the *displayed* partition (with
	// detaches applied), not the rendered table, so a detached-then-restored leaf reappears.
	const partitionVersion = clusterModel.runtime.version
	const orphanThreads = useMemo(() => {
		if (clusterModel === latestModel) return []
		const displayed = new Set<string>()
		for (const node of clusterModel.runtime.getVisible().values()) {
			for (const member of node.members) displayed.add(member)
		}
		const latestIds = new Set(latestModel.table.leaves.map((leaf) => leaf.id))
		return threads.filter((thread) => latestIds.has(thread.id) && !displayed.has(thread.id))
		// The runtime mutates its partition in place; partitionVersion is its change stamp.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clusterModel, latestModel, threads, partitionVersion])
	const heldThreads = useMemo(
		() => threads.filter((thread) => heldThreadIds.has(thread.id) && thread.id !== openId),
		[threads, heldThreadIds, openId]
	)
	// Subscribe to the runtime's partition version, not the raw zoom: onCamera runs on every zoom
	// tick (O(1) threshold checks) but the version only moves when the partition actually changes
	// — so this component only re-renders on cluster changes, not on every camera frame. The memo
	// below keys on a fresh inline read of the version rather than the subscribed value, because
	// render-time detaches (above) bump it after the subscription's computed already evaluated.
	useValue(
		'comment cluster version',
		() => {
			clusterModel.runtime.onCamera(editor.getZoomLevel())
			return clusterModel.runtime.version
		},
		[clusterModel, editor]
	)
	const visibleNodes = useMemo(() => {
		return Array.from(clusterModel.runtime.getVisible().values())
		// The runtime mutates its partition in place; partitionVersion is its change stamp.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clusterModel, partitionVersion])
	const threadsById = useMemo(
		() => new Map<string, TLCommentThread>(threads.map((thread) => [thread.id, thread])),
		[threads]
	)
	const openThread = openId ? threadsById.get(openId) : null
	const hidden = useValue('comments hidden', () => commentsHidden.get(editor), [editor])

	// Mirror the computed pin/badge list into the display atom the canvas overlay util renders.
	// This layer stays the brain — clustering, holds, orphans, and the open thread are decided
	// here — and the util is a renderer of the result. Entries carry anchors, not points: the
	// util resolves each anchor's page point reactively at draw time, so pins ride shape moves
	// and region edits without this mirror rewriting.
	const { resolveAuthor } = props
	useEffect(() => {
		const pinFor = (thread: TLCommentThread): CommentPinDisplayPin => {
			const author = resolveAuthor(thread.createdBy)
			return {
				threadId: thread.id,
				anchor: thread.anchor,
				color: author?.color,
				label: initialOf(author?.name ?? UNKNOWN_AUTHOR),
				resolved: thread.resolved != null,
				// A region's pin centres on its corner — overlapping the box — rather than hanging
				// off it: half the marker's 34px size left and down, in screen px.
				screenOffset: thread.anchor.type === 'region' ? { x: -17, y: 17 } : null,
				// Moving a pin re-anchors the thread record — a commenting write. A region that
				// moves by its body ignores pin drags (the pin only toggles the thread).
				movable: canComment && (thread.anchor.type !== 'region' || options.regionMove !== 'body'),
			}
		}
		const pinsById = new Map<string, CommentPinDisplayPin>()
		const badges: CommentPinDisplayBadge[] = []
		if (options.enableClustering) {
			for (const node of visibleNodes) {
				if (node.count === 1) {
					const thread = threadsById.get(node.id)
					if (thread) pinsById.set(thread.id, pinFor(thread))
				} else {
					badges.push({ nodeId: node.id, point: node.centroid, count: node.count })
				}
			}
			for (const thread of orphanThreads) pinsById.set(thread.id, pinFor(thread))
			for (const thread of heldThreads) pinsById.set(thread.id, pinFor(thread))
		} else {
			for (const thread of threads) {
				if (thread.id !== openId) pinsById.set(thread.id, pinFor(thread))
			}
		}
		if (openThread) pinsById.set(openThread.id, pinFor(openThread))
		commentPinDisplay.set(editor, {
			pins: Array.from(pinsById.values()),
			badges,
			impreciseShapeAnchor,
			canComment,
		})
	}, [
		editor,
		options.enableClustering,
		visibleNodes,
		orphanThreads,
		heldThreads,
		threads,
		openId,
		openThread,
		threadsById,
		impreciseShapeAnchor,
		resolveAuthor,
		canComment,
		options.regionMove,
	])

	// Reset the transient UI state (open thread, half-placed comment, unserved reveal) when this
	// unmounts, and clear the mirrored pin display so the overlay util draws nothing.
	useEffect(() => {
		return () => {
			openThreadId.set(editor, null)
			pendingComment.set(editor, null)
			revealThreadRequest.set(editor, null)
			clusterExpandRequest.set(editor, null)
			commentPinDrag.set(editor, null)
			commentRegionEdit.set(editor, null)
			commentPinDisplay.set(editor, {
				pins: [],
				badges: [],
				impreciseShapeAnchor: DEFAULT_IMPRECISE_SHAPE_ANCHOR,
				canComment: false,
			})
		}
	}, [editor])

	// The requested thread, once it (and, for a comment id, its parent thread) has synced into the
	// store; null while records are still arriving or when no request is pending.
	const requestedRevealThread = useValue(
		'requested reveal thread',
		() => {
			const id = revealThreadRequest.get(editor)
			if (!id) return null
			const record = getCommentRecord(editor, id)
			if (!record) return null
			const thread =
				record.typeName === 'comment' ? getCommentRecord(editor, record.threadId) : record
			return thread?.typeName === 'comment-thread' ? thread : null
		},
		[editor]
	)

	// Serve a pending reveal request: open the thread, zooming to the first cluster split that
	// reveals its pin when it's currently folded into a badge. A reveal is an explicit ask to see
	// the thread, so it also unhides pins — the popover opens on the on-canvas layer, which stays
	// invisible while hidden.
	useEffect(() => {
		if (!requestedRevealThread) return
		revealThreadRequest.set(editor, null)
		commentsHidden.set(editor, false)
		revealThread(
			editor,
			requestedRevealThread,
			clusterModel.table,
			clusterZoomBounds,
			options,
			impreciseShapeAnchor
		)
		openThreadId.set(editor, requestedRevealThread.id)
	}, [
		requestedRevealThread,
		clusterModel.table,
		clusterZoomBounds,
		editor,
		impreciseShapeAnchor,
		options,
	])

	// Clicking a badge zooms to just past the zoom at which that cluster first unclusters,
	// centered on its centroid. The event that created a visible cluster is the event that splits
	// it, and (by the table's sort + monotone thresholds) it has the smallest zSplit of everything
	// applied inside it — so its zSplit is exactly the first split within those comments. The
	// animated zoom-in then drives the runtime cursor like any manual zoom, so the badge splits
	// (and can be drilled into further) with no extra bookkeeping.
	const zoomToClusterSplit = useCallback(
		(node: ClusterNode) => {
			const event = clusterModel.table.events.find((e) => e.result.id === node.id)
			if (!event || !Number.isFinite(event.zSplit)) return
			const zoom = clamp(
				event.zSplit * options.clusterSplitZoomFactor,
				clusterZoomBounds.minZoom,
				clusterZoomBounds.maxZoom
			)
			centerOnPointAtZoom(editor, node.centroid, zoom, CLUSTER_EXPAND_ZOOM_MS)
		},
		[clusterModel, clusterZoomBounds, editor, options]
	)

	// Serve a badge click from the canvas overlay: the util can't reach the cluster table, so it
	// requests the expand and this layer (which owns the table) runs the zoom — the same
	// request/serve split as revealThreadRequest.
	const expandRequestId = useValue(
		'cluster expand request',
		() => clusterExpandRequest.get(editor),
		[editor]
	)
	useEffect(() => {
		if (!expandRequestId) return
		clusterExpandRequest.set(editor, null)
		const node = clusterModel.runtime.getVisible().get(expandRequestId)
		if (node) zoomToClusterSplit(node)
	}, [expandRequestId, editor, clusterModel, zoomToClusterSplit])

	// Escape collapses the open thread. Capture-phase + stopPropagation so it runs ahead of the
	// editor (which would otherwise cancel the current tool or clear the selection). If a comment is
	// being edited, let its own Escape handler exit edit mode first, keeping the thread open.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || openThreadId.get(editor) === null) return
			// The mention picker owns Escape while it's open — let it dismiss the roster alone.
			if (isMentionPickerOpen()) return
			const target = e.target as HTMLElement | null
			if (target && target.closest('.tlui-cmt-editing')) return
			openThreadId.set(editor, null)
			e.preventDefault()
			e.stopPropagation()
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [editor])

	// Shift+C toggles comment-pin visibility on the canvas. Skipped while typing so it never fires
	// from inside a composer. Physical `KeyC` (layout-independent) with shift only.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code !== 'KeyC' || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
			const target = e.target as HTMLElement | null
			if (target && target.closest('input, textarea, [contenteditable="true"]')) return
			toggleCommentsHidden(editor)
			e.preventDefault()
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [editor])

	// Hidden: the whole canvas layer (pins, open popover, pending composer) is withheld. The signal
	// is read above so this component stays mounted and its shortcut/Escape effects keep running.
	if (hidden) return null

	// Render into the container (above the panels' stacking context) so the pins and popovers
	// live in the UI layer rather than being clipped by the canvas layer.
	return createPortal(
		<div ref={layerRef} className="tlui-cmt-canvas-layer">
			{options.enableClustering ? (
				<>
					{/* The pin and badge visuals are canvas-drawn by CommentPinOverlayUtil from the
					    mirrored display atom. ThreadPin mounts here carry the DOM half only — the
					    open thread's popover and a region thread's box and resize handles. */}
					{visibleNodes.map((node) => {
						if (node.count !== 1) return null
						const thread = threadsById.get(node.id)
						if (!thread) return null
						return <ThreadPin key={node.id} editor={editor} thread={thread} {...props} />
					})}
					{orphanThreads.map((thread) => (
						<ThreadPin key={thread.id} editor={editor} thread={thread} {...props} />
					))}
					{heldThreads.map((thread) => (
						<ThreadPin key={thread.id} editor={editor} thread={thread} {...props} />
					))}
				</>
			) : (
				// Clustering off: every thread renders as its own live pin (each returns null when it's
				// not on the current page or its anchor is missing). The open thread is excluded here and
				// rendered once below, mirroring how the clustering path keeps it out of the cluster leaves —
				// otherwise it would mount a second, stacked pin.
				threads
					.filter((thread) => thread.id !== openId)
					.map((thread) => <ThreadPin key={thread.id} editor={editor} thread={thread} {...props} />)
			)}
			{openThread && (
				<ThreadPin key={`open:${openThread.id}`} editor={editor} thread={openThread} {...props} />
			)}
			{pending && showPendingComposer && (
				<PendingComposer editor={editor} pending={pending} {...props} />
			)}
		</div>,
		container
	)
}

const EMPTY_SET: ReadonlySet<string> = new Set()
const MOVED_LEAF_EPSILON = 1e-6

/**
 * Leaves folded inside a badge whose live anchor no longer matches the position the rendered
 * model was built with. Visible (unclustered) leaf pins track their anchor live, so they can
 * stay deferred; a badge can't follow a member, so these must pop out of clustering.
 */
function findMovedClusteredLeafIds(
	rendered: { runtime: ClusterRuntime; table: ClusterTable },
	latest: { table: ClusterTable }
): string[] {
	if (rendered.table === latest.table) return []
	const visible = rendered.runtime.getVisible()
	const latestById = new Map(latest.table.leaves.map((leaf) => [leaf.id, leaf]))
	const moved: string[] = []
	for (const leaf of rendered.table.leaves) {
		if (visible.has(leaf.id)) continue
		const current = latestById.get(leaf.id)
		if (!current) continue
		if (
			Math.abs(current.centroid.x - leaf.centroid.x) > MOVED_LEAF_EPSILON ||
			Math.abs(current.centroid.y - leaf.centroid.y) > MOVED_LEAF_EPSILON
		) {
			moved.push(leaf.id)
		}
	}
	return moved
}

function getClusterZoomBounds(editor: Editor): { minZoom: number; maxZoom: number } {
	const cameraOptions = editor.getCameraOptions()
	const baseZoom = cameraOptions.constraints ? editor.getBaseZoom() : 1
	const zoomSteps = cameraOptions.zoomSteps
	return {
		minZoom: zoomSteps[0] * baseZoom,
		maxZoom: zoomSteps[zoomSteps.length - 1] * baseZoom,
	}
}

function revealThread(
	editor: Editor,
	thread: TLCommentThread,
	table: ClusterTable,
	zoomBounds: { minZoom: number; maxZoom: number },
	options: CommentingOptions,
	impreciseShapeAnchor: { x: number; y: number }
) {
	if (thread.pageId !== editor.getCurrentPageId()) {
		editor.setCurrentPage(thread.pageId as any)
	}

	// Match where the rendered pin sits (resolved prop-or-option), so the camera centers on the pin.
	const point = anchorPagePoint(editor, thread.anchor, impreciseShapeAnchor)
	if (!point) return

	// With clustering off the pin always renders individually, so skip the zoom-to-split (its cluster
	// badge never exists) and just center on the pin.
	if (options.enableClustering) {
		const parentEvent = findDirectParentEvent(table, thread.id)
		if (
			parentEvent &&
			Number.isFinite(parentEvent.zSplit) &&
			parentEvent.zSplit <= zoomBounds.maxZoom
		) {
			const zoom = clamp(
				parentEvent.zSplit * options.clusterSplitZoomFactor,
				zoomBounds.minZoom,
				zoomBounds.maxZoom
			)
			centerOnPointAtZoom(editor, point, zoom)
			return
		}
	}

	editor.centerOnPoint(point, { animation: { duration: 200 } })
}

function findDirectParentEvent(table: ClusterTable, threadId: string): MergeEvent | undefined {
	return table.events.find((event) => event.children.some((child) => child.id === threadId))
}

function centerOnPointAtZoom(
	editor: Editor,
	point: { x: number; y: number },
	zoom: number,
	duration = 200
) {
	const viewport = editor.getViewportScreenBounds()
	editor.setCamera(
		{
			x: viewport.w / (2 * zoom) - point.x,
			y: viewport.h / (2 * zoom) - point.y,
			z: zoom,
		},
		{ animation: { duration } }
	)
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

/** The open thread's popover, portaled above the UI panels. Over it, wheel and hover events pass
 *  through to the canvas (unless the popover is scrolling its own content), like tldraw's panels. */
function ThreadPopover({
	container,
	style,
	children,
}: {
	container: HTMLElement
	style: CSSProperties
	children: ReactNode
}) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	usePassThroughMouseOverEvents(ref)
	return createPortal(
		// contextmenu also stops here: portals bubble React events to the canvas's context-menu
		// trigger (the layer mounts inside it), which would open the canvas menu over this panel.
		<div
			ref={ref}
			className="tlui-cmt-canvas-popover"
			style={style}
			onPointerDown={stop}
			onContextMenu={stop}
		>
			{children}
		</div>,
		container
	)
}

const ThreadPin = memo(function ThreadPin({
	editor,
	thread,
	...props
}: CanvasCommentsProps & {
	editor: Editor
	thread: TLCommentThread
}) {
	const {
		currentUserId,
		resolveAuthor,
		onPostComment,
		isCommentUnread,
		onCommentRead,
		getMentionSuggestions,
		renderMentionSuggestion,
	} = props
	// Name-only view of the resolver, for the mention/rich-text paths (stable identity so
	// CommentBody's memoized render doesn't recompute every render).
	const resolveName = useCallback((id: string) => resolveAuthor(id)?.name, [resolveAuthor])
	const me = currentUserId ? resolveAuthor(currentUserId) : undefined
	const options = useCommentingOptions()
	const canComment = useCanComment(currentUserId)
	const impreciseShapeAnchor = props.impreciseShapeAnchor ?? options.impreciseShapeAnchor
	const container = useContainer()
	const comments = useThreadComments(editor, thread.id)
	const msg = useTranslation()
	// Only one thread's popover is open at a time — shared across pins via the atom.
	const open = useValue('thread open', () => openThreadId.get(editor) === thread.id, [
		editor,
		thread.id,
	])
	// An unsent reply survives closing the thread (saved on every change, keyed by thread id) —
	// the flip side of dismissing without a discard warning.
	const [reply, setReply] = useState<TLRichText>(
		() => getCommentDraft(replyDraftSlot(thread.id)) ?? EMPTY_COMMENT
	)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editText, setEditText] = useState<TLRichText>(EMPTY_COMMENT)
	// The live bounds while the region is being moved or resized — a canvas gesture owned by
	// CommentRegionOverlayUtil, which also draws the box and handles. This read keeps the open
	// popover riding the edit.
	const regionEditBounds = useValue(
		'region edit bounds',
		() => {
			const edit = commentRegionEdit.get(editor)
			return edit && edit.threadId === thread.id ? edit.bounds : null
		},
		[editor, thread.id]
	)
	// Clicking outside the open popover (and off any comment pin) closes the thread — mirrors the
	// pending composer's dismiss. Capture phase + a class check rather than stopPropagation, since the
	// popover portals elsewhere in the DOM. Presses landing on a canvas-drawn pin or badge are
	// excluded so the overlay's own pointer handling runs against the unchanged open state —
	// otherwise this would close first and the open pin's click-toggle would reopen it.
	useEffect(() => {
		if (!open) return
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement | null
			if (!target) return
			if (target.closest('.tlui-cmt-canvas-popover')) return
			const overlayHit = editor.overlays.getOverlayAtPoint(
				editor.screenToPage({ x: e.clientX, y: e.clientY })
			)
			// A press on a pin runs its own toggle; a press on a region's handle or movable body
			// edits its thread — neither dismisses.
			if (
				overlayHit &&
				(overlayHit.type === 'comment_pin' || overlayHit.type === 'comment_region')
			) {
				return
			}
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

	const point = useValue(
		'pin point',
		() => {
			if (thread.pageId !== editor.getCurrentPageId()) return null
			const pagePoint = anchorPagePoint(editor, thread.anchor, impreciseShapeAnchor)
			if (!pagePoint) return null
			const viewportPoint = editor.pageToViewport(pagePoint)
			const inset = impreciseShapePinInset(thread.anchor, impreciseShapeAnchor)
			return inset ? { x: viewportPoint.x + inset.x, y: viewportPoint.y + inset.y } : viewportPoint
		},
		[editor, thread.anchor, thread.pageId, impreciseShapeAnchor]
	)
	const visible = point !== null

	// While the popover is open, every unread comment on display gets reported read — including
	// replies that arrive while it stays open, since the effect re-runs as `comments` changes.
	// The host's receipt write flips isCommentUnread to false, so re-runs find nothing to report.
	useEffect(() => {
		if (!open || !visible || !isCommentUnread || !onCommentRead) return
		for (const comment of comments) {
			if (isCommentUnread(comment.id)) {
				onCommentRead(comment.id)
			}
		}
	}, [open, visible, comments, isCommentUnread, onCommentRead])

	const dragPagePoint = useValue(
		'pin drag point',
		() => {
			const drag = commentPinDrag.get(editor)
			return drag && drag.threadId === thread.id ? drag.pagePoint : null
		},
		[editor, thread.id]
	)

	if (!point) return null

	const postReply = () => {
		if (isCommentEmpty(reply) || !currentUserId) return
		commitCommentMutation(editor, () => {
			const comment = createComment({
				threadId: thread.id,
				pageId: thread.pageId,
				authorId: currentUserId,
				body: reply,
			})
			putCommentRecords(editor, [comment])
			if (onPostComment) onPostComment(comment)
		})
		setReply(EMPTY_COMMENT)
		clearCommentDraft(replyDraftSlot(thread.id))
	}

	const toggleResolve = () => {
		if (!currentUserId) return
		commitCommentMutation(editor, () => {
			putCommentRecords(editor, [
				{
					...thread,
					resolved: thread.resolved ? null : { at: Date.now(), by: currentUserId },
				},
			])
		})
	}

	const deleteThread = () => {
		openThreadId.set(editor, null)
		commitCommentMutation(editor, () =>
			removeCommentRecords(editor, [thread.id, ...comments.map((c) => c.id)])
		)
	}

	const startEdit = (comment: TLComment) => {
		setEditingId(comment.id)
		setEditText(comment.body)
	}

	const deleteComment = (comment: TLComment) => {
		commitCommentMutation(editor, () => {
			// Deleting a thread's only comment deletes the thread — an empty thread has no surface.
			if (comments.length === 1) {
				openThreadId.set(editor, null)
				removeCommentRecords(editor, [thread.id, comment.id])
			} else {
				removeCommentRecords(editor, [comment.id])
			}
		})
	}

	const saveEdit = () => {
		const comment = comments.find((c) => c.id === editingId)
		if (!comment || isCommentEmpty(editText)) return
		commitCommentMutation(editor, () => {
			putCommentRecords(editor, [{ ...comment, body: editText, editedAt: Date.now() }])
		})
		setEditingId(null)
	}

	// Swap a comment for a pre-filled composer while it's being edited; otherwise show the card,
	// with an edit affordance on your own comments.
	const renderComment = (card: CommentCardProps, index: number): ReactNode => {
		const comment = comments[index]
		if (editingId === comment.id) {
			return (
				<div
					className="tlui-cmt-editing"
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setEditingId(null)
							e.stopPropagation()
						}
					}}
				>
					<CommentComposer
						author={card.author}
						placeholder={msg('comments.edit-placeholder')}
						value={editText}
						onChange={setEditText}
						onSubmit={saveEdit}
						sendLabel={msg('comments.save')}
						disabled={isCommentEmpty(editText)}
						getMentionSuggestions={getMentionSuggestions}
						renderMentionSuggestion={renderMentionSuggestion}
						autoFocus
					/>
				</div>
			)
		}
		return (
			<CommentCard
				{...card}
				actions={
					canComment && comment.authorId === currentUserId ? (
						<TldrawUiDropdownMenuRoot id={`comment-actions-${comment.id}`}>
							<TldrawUiDropdownMenuTrigger>
								<TooltipButton
									tooltip={msg('comments.more-options')}
									className="tlui-cmt-thread__action"
								>
									<TldrawUiIcon icon="dots-vertical" label={msg('comments.more-options')} small />
								</TooltipButton>
							</TldrawUiDropdownMenuTrigger>
							<TldrawUiDropdownMenuContent
								className="tlui-cmt-menu"
								side="bottom"
								align="end"
								alignOffset={0}
							>
								<TldrawUiDropdownMenuGroup>
									<TldrawUiDropdownMenuItem>
										<button
											type="button"
											className="tlui-cmt-menu-item"
											onClick={() => startEdit(comment)}
										>
											<span>{msg('comments.edit-comment')}</span>
										</button>
									</TldrawUiDropdownMenuItem>
									<TldrawUiDropdownMenuItem>
										<button
											type="button"
											className="tlui-cmt-menu-item tlui-cmt-menu-item--danger"
											onClick={() => deleteComment(comment)}
										>
											<span>{msg('comments.delete-comment')}</span>
										</button>
									</TldrawUiDropdownMenuItem>
								</TldrawUiDropdownMenuGroup>
							</TldrawUiDropdownMenuContent>
						</TldrawUiDropdownMenuRoot>
					) : undefined
				}
			/>
		)
	}

	// Resolve and delete are commenting writes: behind `canComment`, plus the `currentUserId` a
	// resolve stamps into `resolved.by`.
	const headerActions = (
		<>
			{canComment && currentUserId && (
				<TooltipButton
					tooltip={msg(thread.resolved ? 'comments.reopen' : 'comments.resolve')}
					className="tlui-cmt-thread__action"
					onClick={toggleResolve}
				>
					<TldrawUiIcon
						icon="check"
						label={msg(thread.resolved ? 'comments.reopen' : 'comments.resolve')}
						small
					/>
				</TooltipButton>
			)}
			{canComment && currentUserId && (
				<TldrawUiDropdownMenuRoot id={`comment-thread-actions-${thread.id}`}>
					<TldrawUiDropdownMenuTrigger>
						<TooltipButton
							tooltip={msg('comments.more-options')}
							className="tlui-cmt-thread__action"
						>
							<TldrawUiIcon icon="dots-vertical" label={msg('comments.more-options')} small />
						</TooltipButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent
						className="tlui-cmt-menu"
						side="bottom"
						align="end"
						alignOffset={0}
					>
						<TldrawUiDropdownMenuGroup>
							<TldrawUiDropdownMenuItem>
								<button
									type="button"
									className="tlui-cmt-menu-item tlui-cmt-menu-item--danger"
									onClick={deleteThread}
								>
									<span>{msg('comments.delete')}</span>
								</button>
							</TldrawUiDropdownMenuItem>
						</TldrawUiDropdownMenuGroup>
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
			)}
		</>
	)

	const ComposerFallback = options.components.ComposerFallback

	// The marker is canvas-drawn (CommentPinOverlayUtil), which owns click-to-toggle and the drag
	// gesture itself; this component follows the drag through the commentPinDrag atom to keep the
	// popover and a region's box preview riding the marker.
	const isRegion = thread.anchor.type === 'region'

	// The popover tracks the live edit: a region move/resize moves it to the bounds' pin corner, a
	// pin drag to the marker's drag point; otherwise it sits at the stored anchor's viewport point.
	const livePinPage =
		thread.anchor.type === 'region' && regionEditBounds
			? regionPinPoint(regionEditBounds, regionAnchorPinCorner(editor, thread.anchor))
			: dragPagePoint
	const renderPointBase = livePinPage ? editor.pageToViewport(livePinPage) : point
	// A region's pin centres on its corner — overlapping the box — rather than hanging off it.
	// The marker anchors bottom-left, so step half its 34px size left and down (screen px).
	const renderPoint = isRegion
		? { x: renderPointBase.x - 17, y: renderPointBase.y + 17 }
		: renderPointBase

	return (
		<>
			{/* The marker itself is canvas-drawn by CommentPinOverlayUtil; only the popover is DOM.
			    It portals up to the menus layer (above the UI panels) so it isn't clipped. */}
			{open && (
				<ThreadPopover
					container={container}
					// Clear the bottom-left-anchored pin: it spans 34px right of and above the
					// anchor, plus the open ring's 5px — the popover starts past that, opening
					// above the pin's top.
					style={{ left: renderPoint.x + 48, top: renderPoint.y - 54 }}
				>
					<CommentThread
						header={msg('comments.thread-title')}
						headerActions={headerActions}
						renderComment={renderComment}
						comments={comments.map((c) => toCardProps(c, props, options.components, resolveName))}
						resolvedBanner={
							thread.resolved
								? msg('comments.resolved-by').replace(
										'{name}',
										resolveAuthor(thread.resolved.by)?.name ?? UNKNOWN_AUTHOR
									)
								: undefined
						}
						composer={
							canComment && !thread.resolved
								? {
										author: me ?? UNKNOWN_COMMENT_AUTHOR,
										placeholder: msg('comments.reply-placeholder'),
										sendLabel: msg('comments.send'),
										value: reply,
										onChange: (value: TLRichText) => {
											setReply(value)
											saveCommentDraft(replyDraftSlot(thread.id), value)
										},
										onSubmit: postReply,
										// No user, no author for the record — dead send button.
										disabled: isCommentEmpty(reply) || !currentUserId,
										getMentionSuggestions,
										renderMentionSuggestion,
									}
								: undefined
						}
						footer={
							!canComment && !thread.resolved && ComposerFallback ? (
								<ComposerFallback context="thread" />
							) : undefined
						}
					/>
				</ThreadPopover>
			)}
		</>
	)
})

function PendingComposer({
	editor,
	pending,
	currentUserId,
	resolveAuthor,
	onPostComment,
	getMentionSuggestions,
	renderMentionSuggestion,
}: CanvasCommentsProps & { editor: Editor; pending: PendingComment }) {
	const ComposerFallback = useCommentingOptions().components.ComposerFallback
	const canComment = useCanComment(currentUserId)
	const me = currentUserId ? resolveAuthor(currentUserId) : undefined
	// Click-away keeps the draft (saved on every change) and the next placement composer
	// restores it — the flip side of dismissing without a discard warning.
	const [text, setText] = useState<TLRichText>(
		() => getCommentDraft(NEW_COMMENT_DRAFT) ?? EMPTY_COMMENT
	)
	const ref = useRef<HTMLDivElement>(null)
	const msg = useTranslation()
	const container = useContainer()
	// Over this floating panel, scroll and hover reach the canvas (except where it scrolls itself).
	usePassThroughWheelEvents(ref)
	usePassThroughMouseOverEvents(ref)

	const point = useValue('composer point', () => editor.pageToViewport(pending.point), [
		editor,
		pending.point,
	])

	// Dismiss on a click anywhere outside the composer (capture-phase, ahead of stopPropagation).
	useEffect(() => {
		const onPointerDown = (e: PointerEvent) => {
			const el = ref.current
			const target = e.target as HTMLElement | null
			if (!el || !target) return
			// A click in the composer, or in the mention picker it spawns (portaled elsewhere), is
			// not "outside" — keep the draft open so the pick can insert.
			if (el.contains(target) || target.closest('.tlui-cmt-mention-popup')) return
			pendingComment.set(editor, null)
		}
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => document.removeEventListener('pointerdown', onPointerDown, true)
	}, [editor])

	const submit = () => {
		if (isCommentEmpty(text) || !currentUserId) return
		commitCommentMutation(editor, () => {
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
			putCommentRecords(editor, [thread, comment])
			if (onPostComment) onPostComment(comment)
		})
		setText(EMPTY_COMMENT)
		clearCommentDraft(NEW_COMMENT_DRAFT)
		pendingComment.set(editor, null)
	}

	return createPortal(
		<div
			ref={ref}
			className={[
				'tlui-cmt-canvas-composer',
				pending.anchor.type === 'region' && 'tlui-cmt-canvas-composer--region',
				!canComment && 'tlui-cmt-canvas-composer--fallback',
			]
				.filter(Boolean)
				.join(' ')}
			style={{ left: point.x, top: point.y }}
			onPointerDown={stop}
			onContextMenu={stop}
			onKeyDown={(e) => {
				if (e.key === 'Escape' && !isMentionPickerOpen()) pendingComment.set(editor, null)
			}}
		>
			{canComment ? (
				<CommentComposer
					author={me ?? UNKNOWN_COMMENT_AUTHOR}
					placeholder={msg('comments.add-placeholder')}
					sendLabel={msg('comments.send')}
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
					leading={draftAvatar(me?.color)}
				/>
			) : (
				ComposerFallback && <ComposerFallback context="pending" />
			)}
		</div>,
		container
	)
}
