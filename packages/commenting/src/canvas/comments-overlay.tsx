import { type CommentAuthor, isMentionPickerOpen, MentionMember } from '@tldraw/mentions'
import {
	Fragment,
	memo,
	type PointerEvent as ReactPointerEvent,
	ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
	type BoxModel,
	createComment,
	createCommentThread,
	Editor,
	getFirstCharacter,
	react,
	TLComment,
	TLCommentId,
	TLCommentThread,
	TLRichText,
	useContainer,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
	VecLike,
} from 'tldraw'
import { computeClusterTable } from '../clustering/computeClusterTable'
import { type ClusterRuntime, createClusterRuntime } from '../clustering/runtime'
import type { ClusterNode, ClusterTable, MergeEvent } from '../clustering/types'
import { CommentComposer } from '../ui/comment-composer'
import { EMPTY_COMMENT, isCommentEmpty } from '../ui/comment-extensions'
import { CommentPin } from '../ui/comment-pin'
import { CountBadge } from '../ui/count-badge'
import { registerCommentAnchorLifecycle } from './anchor-lifecycle'
import { collectClusterLeaves } from './cluster-input'
import {
	clearCommentDraft,
	getCommentDraft,
	NEW_COMMENT_DRAFT,
	saveCommentDraft,
} from './comment-drafts'
import { UNKNOWN_AUTHOR, UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { getCommentRecord, putCommentRecords } from './comment-store'
import { PendingComment } from './comment-tool'
import { useCommentThreads, useThreadComments } from './hooks'
import { useCommentingEnabled } from './license'
import {
	type CommentingOptions,
	getCommentingOptions,
	useCanComment,
	useCommentingOptions,
} from './options'
import { computePinStacks, pinStackKey } from './pin-stacking'
import {
	commentsHidden,
	commitCommentMutation,
	openStackId,
	openThreadId,
	pendingComment,
	regionDraft,
	revealThreadRequest,
	toggleCommentsHidden,
	usePendingComment,
} from './state'
import { ThreadPreview, sortThreadsForPreview, useMarkerPreview } from './thread-preview'
import { ThreadStackPin } from './thread-stack'
import {
	anchorPagePoint,
	commentTargetShapeAt,
	impreciseShapePinInset,
	REGION_PIN_CORNER,
	regionAnchorPinCorner,
	regionPinPoint,
	shapeAnchorAt,
} from './thread-state'
import { POPOVER_OFFSET, ThreadPopover, ThreadView } from './thread-view'

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
}

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

/** A pointer-down that belongs to the camera, not the comment UI: any non-primary button
 *  (middle/right-button pans), or a primary press with the spacebar pan key held. */
const isCanvasPanGesture = (editor: Editor, e: ReactPointerEvent) =>
	e.button !== 0 || editor.inputs.keys.has('Space')

/** Hand a pointer event to the canvas beneath the comments layer, marked the same way the
 *  pass-through wheel/hover hooks mark their re-dispatched events. */
function forwardPointerEventToCanvas(container: HTMLElement, e: ReactPointerEvent) {
	const cvs = container.querySelector('.tl-canvas')
	if (!cvs) return
	const newEvent = new PointerEvent(e.type, e.nativeEvent as any)
	;(newEvent as any).isSpecialRedispatchedEvent = true
	cvs.dispatchEvent(newEvent)
}

const initialOf = (name: string): string => (getFirstCharacter(name.trim()) || '?').toUpperCase()
const CLUSTER_FADE_MS = 150
/** Duration of the click-a-badge zoom-to-split animation. */
const CLUSTER_EXPAND_ZOOM_MS = 450
/** How far past a cluster's split zoom to land when expanding it — a 5% overshoot, so the badge
 *  lands clear of the threshold it just crossed rather than flickering on it. */
const CLUSTER_SPLIT_ZOOM_FACTOR = 1.05
/** Screen-pixel margin by which the viewport is inflated when culling cluster badges, so a badge
 *  just off-screen is already mounted when a pan brings it in. */
const CLUSTER_CULL_MARGIN_PX = 120

/** The leading element for the placement composer — the comment pin's shape, but a pencil
 *  instead of an initial, marking an unsent draft. */
const draftAvatar = (
	<CommentPin>
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

/** @public @react */
export function CanvasComments(props: CanvasCommentsProps) {
	// Gate the whole layer on the license before doing any work. The inner component holds all the
	// other hooks, so mounting/unmounting it as the license resolves keeps hook order stable here.
	const commentingEnabled = useCommentingEnabled()
	if (!commentingEnabled) return null
	return <CanvasCommentsLayer {...props} />
}

/**
 * A mount point appended to the end of the editor container, for a portal that has to come last
 * among the container's children.
 *
 * `createPortal(…, container)` doesn't get to say where its node lands: React places a portal
 * during the same commit that mounts it, and a portal nested this deep in the tree is placed
 * before the container's own, shallower children — so the layer ends up ahead of the UI and its
 * "move focus to canvas" skip link. That link only works if nothing precedes it, and the pins are
 * real buttons, so a single comment would take the first tab stop and leave no keyboard route to
 * the canvas. A layout effect runs after the whole commit instead, by which point the container's
 * children are all in place and appending is guaranteed to land at the end.
 *
 * Null until the effect has run, so the first render has nothing to portal into.
 */
function useTrailingPortalHost(container: HTMLElement) {
	const [host, setHost] = useState<HTMLDivElement | null>(null)
	useLayoutEffect(() => {
		const elm = container.ownerDocument.createElement('div')
		// The host is a position in the DOM, not a box — what it holds is positioned against the
		// container, the same as it was when it hung off the container directly.
		elm.style.display = 'contents'
		container.appendChild(elm)
		setHost(elm)
		return () => {
			elm.remove()
			setHost(null)
		}
	}, [container])
	return host
}

function CanvasCommentsLayer(props: CanvasCommentsProps) {
	const editor = useEditor()
	const options = useCommentingOptions()
	const container = useContainer()
	const portalHost = useTrailingPortalHost(container)
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
	useEffect(() => registerCommentAnchorLifecycle(editor), [editor])
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
				openThreadId.get(editor)
			),
		[editor, threads, heldThreadIds]
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
	const fadeNodes = useFadeVisibleNodes(visibleNodes, clusterModel)
	const threadsById = useMemo(
		() => new Map<string, TLCommentThread>(threads.map((thread) => [thread.id, thread])),
		[threads]
	)
	// Zooming separates near pins, but pins with the *same* anchor point (several imprecise
	// comments on one shape) coincide at every zoom — those render as one count-badge stack that
	// opens the threads as a list. Keyed on page-space anchors, so camera moves never recompute this.
	const pinStacks = useValue('comment pin stacks', () => computePinStacks(editor, threads), [
		editor,
		threads,
	])
	const openThread = openId ? threadsById.get(openId) : null
	const hidden = useValue('comments hidden', () => commentsHidden.get(editor), [editor])

	// Reset the transient UI state (open thread, open stack, half-placed comment, unserved reveal)
	// when this unmounts.
	useEffect(() => {
		return () => {
			openThreadId.set(editor, null)
			openStackId.set(editor, null)
			pendingComment.set(editor, null)
			revealThreadRequest.set(editor, null)
		}
	}, [editor])

	// Clear a stale open-stack key. `openStackId` is a stack's coincident point key, and only the
	// stack's own (mounted) handlers clear it — so collapsing the stack to a single pin unmounts the
	// `ThreadStackPin` and strands the key. A dangling `openStackId` is not harmless: `useMarkerPreview`
	// treats any non-null value as "a stack is open" and suppresses every hover preview until it's
	// cleared. Keep it while any live stack still sits at that key (so losing a member — even the
	// oldest — keeps the list open under the survivors), and clear it once none does.
	useEffect(() => {
		const key = openStackId.get(editor)
		if (!key) return
		for (const id of pinStacks.keys()) {
			const thread = threadsById.get(id)
			if (!thread) continue
			const point = anchorPagePoint(editor, thread.anchor)
			if (point && pinStackKey(point) === key) return
		}
		openStackId.set(editor, null)
	}, [editor, pinStacks, threadsById])

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
		revealThreadPin(editor, requestedRevealThread, clusterModel.table, clusterZoomBounds, options)
		openThreadId.set(editor, requestedRevealThread.id)
	}, [requestedRevealThread, clusterModel.table, clusterZoomBounds, editor, options])

	// Picking a thread out of a cluster's hover preview. Setting `openThreadId` alone would work —
	// the thread leaves the cluster input and renders its own pin — but it would cut straight there
	// from wherever the badge was. Zoom in on it first, the same move (and duration) the badge's
	// own click makes, so the thread arrives instead of appearing.
	const revealClusteredThread = useCallback(
		(thread: TLCommentThread) => {
			revealThreadPin(
				editor,
				thread,
				clusterModel.table,
				clusterZoomBounds,
				options,
				CLUSTER_EXPAND_ZOOM_MS
			)
			openThreadId.set(editor, thread.id)
		},
		[clusterModel.table, clusterZoomBounds, editor, options]
	)

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
				event.zSplit * CLUSTER_SPLIT_ZOOM_FACTOR,
				clusterZoomBounds.minZoom,
				clusterZoomBounds.maxZoom
			)
			centerOnPointAtZoom(editor, node.centroid, zoom, CLUSTER_EXPAND_ZOOM_MS)
		},
		[clusterModel, clusterZoomBounds, editor]
	)

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

	// Which threads are on screen this render, across every path below. A stack renders exactly
	// once, owned by its first member that is actually on screen — members can arrive by different
	// paths (a leaf via clustering while its open sibling renders via the open slot), so ownership
	// can't be decided per-path.
	// A cluster node that is exactly one coincident stack — every member shares a single pin-stack
	// group, with no distinct-position comment mixed in. Such a node is a stack standing on its own
	// (its neighbours have already split off as the view zoomed in), so it renders as the immediate
	// cascading count-badge list rather than a zoom-to-split cluster badge. Returns the stack's full
	// group — which can include an open or orphan member the node's own leaves omit — or null.
	const stackGroupOf = (node: ClusterNode): readonly string[] | null => {
		const group = pinStacks.get(node.members[0])
		if (!group) return null
		return node.members.every((id) => group.includes(id)) ? group : null
	}

	const renderedThreadIds = new Set<string>()
	if (options.enableClustering) {
		for (const { node } of fadeNodes) {
			if (node.count === 1) renderedThreadIds.add(node.id)
			// A pure-stack node owns its members here (they aren't count-1 leaves), so register them so
			// the owner logic can pick one — mirroring how count-1 leaves are added above.
			else if (stackGroupOf(node)) for (const id of node.members) renderedThreadIds.add(id)
		}
		for (const thread of orphanThreads) renderedThreadIds.add(thread.id)
		for (const thread of heldThreads) renderedThreadIds.add(thread.id)
	} else {
		for (const thread of threads) renderedThreadIds.add(thread.id)
	}
	if (openThread) renderedThreadIds.add(openThread.id)

	// A coincident-stack member renders as the group's single count-badge stack (if it owns it)
	// or not at all; everything else is an ordinary pin.
	const renderThreadPin = (thread: TLCommentThread): ReactNode => {
		const group = pinStacks.get(thread.id)
		if (group) {
			const owner = group.find((id) => renderedThreadIds.has(id))
			if (owner !== thread.id) return null
			const stackThreads = group
				.map((id) => threadsById.get(id))
				.filter((t): t is TLCommentThread => t !== undefined)
			return <ThreadStackPin editor={editor} threads={stackThreads} {...props} />
		}
		return <ThreadPin editor={editor} thread={thread} {...props} />
	}

	// Render into the container (above the panels' stacking context) so the pins and popovers
	// live in the UI layer rather than being clipped by the canvas layer — but at the end of it,
	// behind the editor's own children in the tab order. See `useTrailingPortalHost`.
	if (!portalHost) return null
	return createPortal(
		<div ref={layerRef} className="tlui-cmt-canvas-layer">
			{options.enableClustering ? (
				<>
					{fadeNodes.map(({ node, phase }) => {
						let content: ReactNode
						const stackGroup = node.count > 1 ? stackGroupOf(node) : null
						if (node.count === 1) {
							const thread = threadsById.get(node.id)
							if (!thread) return null
							content = renderThreadPin(thread)
						} else if (stackGroup) {
							// A coincident stack standing alone: draw the cascading count-badge list now
							// instead of a zoom-to-split cluster badge. Route it through the stack's owner so
							// the open/orphan/held slots stay deduped — when the owner is one of them, that
							// slot draws the stack and this node draws nothing.
							const owner = stackGroup.find((id) => renderedThreadIds.has(id))
							content =
								owner && node.members.includes(owner)
									? renderThreadPin(threadsById.get(owner)!)
									: null
						} else {
							content = (
								<ClusterBadge
									editor={editor}
									node={node}
									onExpand={zoomToClusterSplit}
									onSelectThread={revealClusteredThread}
									threadsById={threadsById}
									currentUserId={props.currentUserId}
									resolveAuthor={props.resolveAuthor}
								/>
							)
						}
						return (
							<div key={`cluster-fade:${node.id}`} className={clusterFadeClassName(phase)}>
								{content}
							</div>
						)
					})}
					{orphanThreads.map((thread) => (
						<Fragment key={thread.id}>{renderThreadPin(thread)}</Fragment>
					))}
					{heldThreads.map((thread) => (
						<Fragment key={thread.id}>{renderThreadPin(thread)}</Fragment>
					))}
				</>
			) : (
				// Clustering off: every thread renders as its own live pin (each returns null when it's
				// not on the current page or its anchor is missing). The open thread is excluded here and
				// rendered once below, mirroring how the clustering path keeps it out of the cluster leaves —
				// otherwise it would mount a second, stacked pin.
				threads
					.filter((thread) => thread.id !== openId)
					.map((thread) => <Fragment key={thread.id}>{renderThreadPin(thread)}</Fragment>)
			)}
			{openThread && (
				<Fragment key={`open:${openThread.id}`}>{renderThreadPin(openThread)}</Fragment>
			)}
			<RegionDraftBox editor={editor} />
			{/* Keep the region visible while composing — the drag draft is gone by now, and no thread
			    exists yet, so the pending anchor is what shows the area under the open composer. */}
			{pending?.anchor.type === 'region' && showPendingComposer && (
				<RegionBox editor={editor} box={pending.anchor} />
			)}
			{pending && showPendingComposer && (
				<PendingComposer editor={editor} pending={pending} {...props} />
			)}
		</div>,
		portalHost
	)
}

const EMPTY_SET: ReadonlySet<string> = new Set()
const MOVED_LEAF_EPSILON = 1e-6
type ClusterFadePhase = 'entering' | 'present' | 'exiting'

interface ClusterFadeNode {
	node: ClusterNode
	phase: ClusterFadePhase
}

function useFadeVisibleNodes(
	nodes: readonly ClusterNode[],
	resetKey: { runtime: ClusterRuntime; table: ClusterTable }
): ClusterFadeNode[] {
	const resetKeyRef = useRef(resetKey)
	const didReset = resetKeyRef.current !== resetKey
	if (didReset) {
		resetKeyRef.current = resetKey
	}

	const [fadeNodes, setFadeNodes] = useState<ClusterFadeNode[]>(() => toPresentFadeNodes(nodes))
	const renderedNodes = didReset ? toPresentFadeNodes(nodes) : fadeNodes

	useEffect(() => {
		setFadeNodes(toPresentFadeNodes(nodes))
		// Resets only on a new model (resetKey); node-list changes within the same model are
		// handled by the reconcile effect below, which fades entries in/out instead of snapping.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resetKey])

	useEffect(() => {
		if (didReset) return
		setFadeNodes((previous) => reconcileFadeNodes(previous, nodes))
	}, [didReset, nodes])

	const hasEntering = renderedNodes.some((item) => item.phase === 'entering')
	useEffect(() => {
		if (!hasEntering) return
		const frame = requestClusterFadeFrame(() => {
			setFadeNodes((previous) =>
				previous.map((item) => (item.phase === 'entering' ? { ...item, phase: 'present' } : item))
			)
		})
		return () => cancelClusterFadeFrame(frame)
	}, [hasEntering, renderedNodes])

	const hasExiting = renderedNodes.some((item) => item.phase === 'exiting')
	useEffect(() => {
		if (!hasExiting) return
		const timeout = window.setTimeout(() => {
			setFadeNodes((previous) => previous.filter((item) => item.phase !== 'exiting'))
		}, CLUSTER_FADE_MS)
		return () => window.clearTimeout(timeout)
	}, [hasExiting, renderedNodes])

	return renderedNodes
}

function toPresentFadeNodes(nodes: readonly ClusterNode[]): ClusterFadeNode[] {
	return nodes.map((node) => ({ node, phase: 'present' }))
}

function reconcileFadeNodes(
	previous: readonly ClusterFadeNode[],
	nextNodes: readonly ClusterNode[]
): ClusterFadeNode[] {
	const previousById = new Map(previous.map((item) => [item.node.id, item]))
	const nextIds = new Set(nextNodes.map((node) => node.id))
	const next: ClusterFadeNode[] = []

	for (const node of nextNodes) {
		const previousItem = previousById.get(node.id)
		next.push({
			node,
			phase:
				previousItem && previousItem.phase !== 'exiting'
					? previousItem.phase
					: previousItem
						? 'present'
						: 'entering',
		})
	}

	for (const item of previous) {
		if (nextIds.has(item.node.id)) continue
		next.push(item.phase === 'exiting' ? item : { ...item, phase: 'exiting' })
	}

	return next
}

function requestClusterFadeFrame(callback: FrameRequestCallback): number {
	if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback)
	return window.setTimeout(() => callback(0), 16)
}

function cancelClusterFadeFrame(frame: number) {
	if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
	else window.clearTimeout(frame)
}

function clusterFadeClassName(phase: ClusterFadePhase): string {
	return `tlui-cmt-cluster-fade tlui-cmt-cluster-fade--${phase}`
}

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

function revealThreadPin(
	editor: Editor,
	thread: TLCommentThread,
	table: ClusterTable,
	zoomBounds: { minZoom: number; maxZoom: number },
	options: CommentingOptions,
	duration = 200
) {
	if (thread.pageId !== editor.getCurrentPageId()) {
		editor.setCurrentPage(thread.pageId as any)
	}

	const point = anchorPagePoint(editor, thread.anchor)
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
				parentEvent.zSplit * CLUSTER_SPLIT_ZOOM_FACTOR,
				zoomBounds.minZoom,
				zoomBounds.maxZoom
			)
			centerOnPointAtZoom(editor, point, zoom, duration)
			return
		}
	}

	editor.centerOnPoint(point, { animation: { duration } })
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

// Memoized: cluster nodes and thread records are identity-stable while unchanged, so pins and
// badges skip re-rendering when the parent re-renders for reasons that don't concern them
// (leaf recomputes during shape drags, partition changes elsewhere). Camera tracking still
// works — each component subscribes to its own viewport position via signals, not via props.
const ClusterBadge = memo(function ClusterBadge({
	editor,
	node,
	onExpand,
	onSelectThread,
	threadsById,
	...props
}: Pick<CanvasCommentsProps, 'currentUserId' | 'resolveAuthor'> & {
	editor: Editor
	node: ClusterNode
	onExpand(node: ClusterNode): void
	onSelectThread(thread: TLCommentThread): void
	threadsById: ReadonlyMap<string, TLCommentThread>
}) {
	const container = useContainer()
	const msg = useTranslation()
	const badgeRef = useRef<HTMLButtonElement>(null)
	const { previewShown, previewHandlers } = useMarkerPreview(editor, `cluster:${node.id}`)
	// Wheel pass-through sits on the badge (never scrollable), not the layer root — see the
	// note on the layer.
	usePassThroughWheelEvents(badgeRef)
	const point = useValue(
		'cluster badge point',
		() => {
			const pagePoint = editor.pageToViewport(node.centroid)
			if (!isInInflatedViewport(editor, pagePoint)) return null
			return pagePoint
		},
		[editor, node]
	)

	// `node.members` is sorted by id (the clustering table's ordering); the preview wants them in
	// the order a reader would expect. Only computed while the preview is up.
	const previewThreads = useMemo(() => {
		if (!previewShown) return []
		const threads: TLCommentThread[] = []
		for (const id of node.members) {
			const thread = threadsById.get(id)
			if (thread) threads.push(thread)
		}
		return sortThreadsForPreview(threads)
	}, [previewShown, node.members, threadsById])

	if (!point) return null

	return (
		<>
			<button
				ref={badgeRef}
				type="button"
				className="tlui-cmt-button tlui-cmt-canvas-cluster"
				style={{ left: point.x, top: point.y }}
				aria-label={msg('comments.cluster-label').replace('{count}', String(node.count))}
				onPointerDown={(e) => {
					if (isCanvasPanGesture(editor, e)) {
						forwardPointerEventToCanvas(container, e)
						return
					}
					e.stopPropagation()
				}}
				onClick={(e) => {
					e.stopPropagation()
					onExpand(node)
				}}
				{...previewHandlers}
				onFocus={previewHandlers.onPointerEnter}
				onBlur={previewHandlers.onPointerLeave}
			>
				<CountBadge count={node.count} />
			</button>
			{previewShown && previewThreads.length > 0 && (
				<ThreadPreview
					editor={editor}
					threads={previewThreads}
					container={container}
					variant="list"
					point={point}
					onSelectThread={onSelectThread}
					{...previewHandlers}
					{...props}
				/>
			)}
		</>
	)
})

function isInInflatedViewport(editor: Editor, point: { x: number; y: number }): boolean {
	const viewport = editor.getViewportScreenBounds()
	const margin = CLUSTER_CULL_MARGIN_PX
	return (
		point.x >= -margin &&
		point.y >= -margin &&
		point.x <= viewport.w + margin &&
		point.y <= viewport.h + margin
	)
}

/** A dashed rectangle over a region anchor's bounds, in viewport space. Sits in the canvas layer as
 *  a sibling of the pins. `pointer-events` stays off (canvas interaction passes through) unless
 *  `movable`, in which case dragging the body translates the region — previews live, commits on drop. */
/** A region's dashed box. Purely visual — a region moves by its pin and resizes from its corner
 *  handles, so the box itself takes no pointer events. */
function RegionBox({ editor, box }: { editor: Editor; box: BoxModel }) {
	const rect = useValue(
		'region rect',
		() => {
			// Position from the page→viewport top-left; screen size scales with zoom, page size doesn't.
			const topLeft = editor.pageToViewport({ x: box.x, y: box.y })
			const zoom = editor.getZoomLevel()
			return { left: topLeft.x, top: topLeft.y, width: box.w * zoom, height: box.h * zoom }
		},
		[editor, box.x, box.y, box.w, box.h]
	)
	return <div className="tlui-cmt-canvas-region" style={rect} />
}

/** The live region being dragged out by the comment tool, or nothing when not dragging. */
function RegionDraftBox({ editor }: { editor: Editor }) {
	const box = useValue('region draft', () => regionDraft.get(editor), [editor])
	if (!box) return null
	return <RegionBox editor={editor} box={box} />
}

// A resize handle's normalized 0–1 spot on the box, and its cursor. An axis at 0.5 is *not*
// controlled by that handle — the resize math reads the spot rather than special-casing corners.
interface RegionHandle {
	x: number
	y: number
	cursor: string
}

// The four corners, each resizing both axes.
const REGION_CORNERS: readonly RegionHandle[] = [
	{ x: 0, y: 0, cursor: 'nwse-resize' },
	{ x: 1, y: 0, cursor: 'nesw-resize' },
	{ x: 0, y: 1, cursor: 'nesw-resize' },
	{ x: 1, y: 1, cursor: 'nwse-resize' },
]

// Screen-space slack around a region's bounds within which its box and handles stay revealed, so
// the handles (which sit on the edge) are comfortably reachable.
const REGION_HANDLE_MARGIN_PX = 12

/** Resize `box` by dragging `handle` to `cursor` (page coords). Each controlled axis spans from the
 *  handle's fixed opposite edge to the cursor (normalized, so dragging past it flips); an axis the
 *  handle doesn't control (a midpoint, at 0.5) keeps its original position and size. */
function resizeRegion(box: BoxModel, handle: RegionHandle, cursor: VecLike): BoxModel {
	const controlsX = handle.x !== 0.5
	const controlsY = handle.y !== 0.5
	const fixedX = box.x + (1 - handle.x) * box.w
	const fixedY = box.y + (1 - handle.y) * box.h
	return {
		x: controlsX ? Math.min(fixedX, cursor.x) : box.x,
		y: controlsY ? Math.min(fixedY, cursor.y) : box.y,
		w: controlsX ? Math.abs(cursor.x - fixedX) : box.w,
		h: controlsY ? Math.abs(cursor.y - fixedY) : box.h,
	}
}

/** Draggable handles that resize a region — corners (both axes) or edges (one axis), per the resize
 *  option. Previews live, commits on release. */
function RegionResizeHandles({
	editor,
	box,
	handles,
	onPreview,
	onCommit,
}: {
	editor: Editor
	box: BoxModel
	handles: readonly RegionHandle[]
	onPreview(bounds: BoxModel | null): void
	onCommit(bounds: BoxModel): void
}) {
	// The box at pointer-down, captured so the box prop reflowing under the live preview doesn't move
	// the fixed edges mid-drag.
	const boxRef = useRef<BoxModel | null>(null)
	const points = useValue(
		'region handle points',
		() =>
			handles.map((h) => {
				const p = editor.pageToViewport({ x: box.x + h.x * box.w, y: box.y + h.y * box.h })
				return { ...h, key: `${h.x}-${h.y}`, left: p.x, top: p.y }
			}),
		[editor, box.x, box.y, box.w, box.h, handles]
	)
	const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
		e.stopPropagation()
		boxRef.current = box
		e.currentTarget.setPointerCapture(e.pointerId)
	}
	const resizedTo = (h: RegionHandle, e: ReactPointerEvent<HTMLDivElement>): BoxModel =>
		resizeRegion(boxRef.current!, h, editor.screenToPage({ x: e.clientX, y: e.clientY }))
	const onResize = (h: RegionHandle) => (e: ReactPointerEvent<HTMLDivElement>) => {
		if (boxRef.current) onPreview(resizedTo(h, e))
	}
	const endResize = (h: RegionHandle) => (e: ReactPointerEvent<HTMLDivElement>) => {
		if (!boxRef.current) return
		const bounds = resizedTo(h, e)
		boxRef.current = null
		if (e.currentTarget.hasPointerCapture(e.pointerId))
			e.currentTarget.releasePointerCapture(e.pointerId)
		onCommit(bounds)
	}
	return (
		<>
			{points.map((h) => (
				<div
					key={h.key}
					className="tlui-cmt-canvas-region-handle"
					style={{ left: h.left, top: h.top, cursor: h.cursor }}
					onPointerDown={startResize}
					onPointerMove={onResize(h)}
					onPointerUp={endResize(h)}
				/>
			))}
		</>
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
	// The live bounds while a corner handle is resizing the region, else null.
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

	// Clicking outside the open popover (and off its own pin) closes the thread — mirrors the
	// pending composer's dismiss. Capture phase + a class check rather than stopPropagation, since the
	// popover portals elsewhere in the DOM. The pin marker is excluded so its own click-to-toggle
	// handles it instead of this closing then the toggle reopening.
	useEffect(() => {
		if (!open) return
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement | null
			if (!target) return
			if (target.closest('.tlui-cmt-canvas-popover')) return
			const marker = markerRef.current
			if (marker && marker.contains(target)) return
			// A press on a region's resize handle or movable body edits this thread — don't dismiss it.
			if (target.closest('.tlui-cmt-canvas-region-handle, .tlui-cmt-canvas-region--movable')) return
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
			const pagePoint = anchorPagePoint(editor, thread.anchor)
			if (!pagePoint) return null
			const viewportPoint = editor.pageToViewport(pagePoint)
			const inset = impreciseShapePinInset(editor, thread.anchor)
			return inset ? { x: viewportPoint.x + inset.x, y: viewportPoint.y + inset.y } : viewportPoint
		},
		[editor, thread.anchor, thread.pageId]
	)
	if (!point) return null

	const PinContent = options.components.PinContent
	// The `PinContent` component slot overrides the built-in author-initial default.
	const threadAuthor = resolveAuthor(thread.createdBy)
	const pinContent = PinContent ? (
		<PinContent thread={thread} comments={comments} />
	) : (
		initialOf(threadAuthor?.name ?? UNKNOWN_AUTHOR)
	)
	const pinLabel = msg(
		thread.resolved ? 'comments.pin-label-resolved' : 'comments.pin-label'
	).replace('{name}', threadAuthor?.name ?? UNKNOWN_AUTHOR)

	// Drag the marker to move the thread: its position is overridden locally while dragging, then
	// re-anchored on drop. A point/shape thread re-anchors to whatever it's dropped on (a shape, else
	// a point); a region thread translates, keeping its size. A pointer that barely moves is a click —
	// toggle the popover.
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
		commitCommentMutation(editor, () => putCommentRecords(editor, [{ ...thread, anchor }]), 'drag')
	}

	// The pin (and its popover) track the live edit: a resize moves it to the region's pin corner, a
	// move to the drag point; otherwise it sits at the stored anchor's viewport point.
	const livePinPage = resizeBounds ? regionPinPoint(resizeBounds, pinCorner) : dragPagePoint
	const renderPointBase = livePinPage ? editor.pageToViewport(livePinPage) : point
	// A region's pin centres on its corner — overlapping the box — rather than hanging off it.
	// The marker anchors bottom-left, so step half its 34px size left and down (screen px).
	const renderPoint = isRegion
		? { x: renderPointBase.x - 17, y: renderPointBase.y + 17 }
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
			() => putCommentRecords(editor, [{ ...thread, anchor: { ...regionAnchor!, ...bounds } }]),
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
					<CommentPin resolved={thread.resolved != null} open={open} color={threadAuthor?.color}>
						{pinContent}
					</CommentPin>
				</button>
				{/* The popover portals up to the menus layer (above the UI panels) so it isn't clipped;
			    the pin itself stays in the canvas-in-front layer, beneath the UI. */}
				{open && (
					<ThreadPopover
						container={container}
						style={{
							left: renderPoint.x + POPOVER_OFFSET.thread.x,
							top: renderPoint.y + POPOVER_OFFSET.thread.y,
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
						container={container}
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
					leading={draftAvatar}
				/>
			) : (
				ComposerFallback && <ComposerFallback context="pending" />
			)}
		</div>,
		container
	)
}
