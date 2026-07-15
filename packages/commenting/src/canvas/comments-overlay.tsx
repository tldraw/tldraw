import {
	memo,
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
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
import { CountBadge } from '../ui/count-badge'
import { collectClusterLeaves } from './cluster-input'
import { CommentBody } from './comment-body'
import { pendingComment, PendingComment } from './comment-tool'
import { commentsHidden, toggleCommentsHidden } from './comments-visibility'
import { useCommentThreads, usePendingComment, useThreadComments } from './hooks'
import { useCommentingEnabled } from './license'
import { anchorPagePoint, openThreadId, shapeAnchorAt } from './thread-state'
import './canvas.css'

/**
 * A ready-to-use comments layer for a tldraw canvas: pins each thread at its anchor, opens a
 * thread popover (with a reply composer) on click, and shows a composer where the comment tool
 * placed a new thread. Reads/writes comment records straight from `editor.store`.
 *
 * It's meant as the batteries-included default — every visible piece is a lever (`renderBody`,
 * `renderPinContent`), and the pieces it composes (`CommentPin`, `CommentThread`, `CommentComposer`,
 * the hooks, the tool) are all exported, so a consumer can rebuild this from parts instead.
 */
export interface CanvasCommentsProps {
	/** The signed-in user's id, or null for a read-only viewer. Only a signed-in user composes. */
	currentUserId: string | null
	/** Map an author id to a display name. */
	resolveName(id: string): string
	/** Render a comment's body. Defaults to the rich-text body (`<CommentBody>`). */
	renderBody?(comment: TLComment): ReactNode
	/** Render a pin's content. Defaults to the thread author's initial. */
	renderPinContent?(thread: TLCommentThread, comments: TLComment[]): ReactNode
	/** Called after any comment (a new thread's first comment, or a reply) is posted. */
	onPostComment?(comment: TLComment): void
	/** Whether a comment is unread for the current user (return true for unread). */
	isCommentUnread?(commentId: TLCommentId): boolean
	/**
	 * Called for each unread comment shown to the user in an open thread popover, so hosts can
	 * record a read receipt. Needs {@link isCommentUnread} to know what's unread.
	 */
	onCommentRead?(commentId: TLCommentId): void
	/** Where imprecise shape pins sit — a normalized (0–1) spot within the shape. Default top-right. */
	impreciseShapeAnchor?: { x: number; y: number }
}

// TEMPORARY diagnostics for verifying the local-detach redesign in the app. Remove before merge.
const DEBUG_CLUSTERING = true
function debugPartitionDiff(
	label: string,
	before: ReadonlyMap<string, ClusterNode>,
	after: ReadonlyMap<string, ClusterNode>
) {
	if (!DEBUG_CLUSTERING) return
	const groupOf = (m: ReadonlyMap<string, ClusterNode>) => {
		const g = new Map<string, string>()
		for (const node of m.values()) for (const id of node.members) g.set(id, node.members.join('+'))
		return g
	}
	const b = groupOf(before)
	const a = groupOf(after)
	const changes: string[] = []
	for (const [id, group] of b)
		if (a.get(id) !== group) changes.push(`${id}: [${group}] -> [${a.get(id) ?? 'GONE'}]`)
	for (const id of a.keys()) if (!b.has(id)) changes.push(`${id}: NEW -> [${a.get(id)}]`)
	// eslint-disable-next-line no-console
	console.warn(`[cluster-debug] ${label}: ${changes.length} membership changes`, changes)
}

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

const initialOf = (name: string): string => (getFirstCharacter(name.trim()) || '?').toUpperCase()
const CLUSTER_DMAX = 120
const CLUSTER_FADE_MS = 150
/** Duration of the click-a-badge zoom-to-split animation. */
const CLUSTER_EXPAND_ZOOM_MS = 450

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

function toCardProps(comment: TLComment, props: CanvasCommentsProps): CommentCardProps {
	return {
		author: props.resolveName(comment.authorId),
		body: props.renderBody ? props.renderBody(comment) : <CommentBody richText={comment.body} />,
		date: new Date(comment.createdAt).toISOString(),
		you: comment.authorId === props.currentUserId,
		edited: comment.editedAt != null,
	}
}

export function CanvasComments(props: CanvasCommentsProps) {
	// Gate the whole layer on the license before doing any work. The inner component holds all the
	// other hooks, so mounting/unmounting it as the license resolves keeps hook order stable here.
	const commentingEnabled = useCommentingEnabled()
	if (!commentingEnabled) return null
	return <CanvasCommentsLayer {...props} />
}

function CanvasCommentsLayer(props: CanvasCommentsProps) {
	const editor = useEditor()
	const container = useContainer()
	const layerRef = useRef<HTMLDivElement>(null)
	// Over the pins and cluster badges, wheel and hover pass through to the canvas beneath (these
	// events bubble up from the pointer-interactive markers to this layer root).
	usePassThroughWheelEvents(layerRef)
	usePassThroughMouseOverEvents(layerRef)
	const deepLinkHandled = useRef(false)
	const threads = useCommentThreads(editor)
	const pending = usePendingComment()
	const openId = useValue('open thread id', () => openThreadId.get(), [])
	const { impreciseShapeAnchor } = props
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
				openThreadId.get(),
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
		debugPartitionDiff(
			'rejoin adoption',
			renderedModel.runtime.getVisible(),
			latestModel.runtime.getVisible()
		)
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
		// eslint-disable-next-line no-console
		if (DEBUG_CLUSTERING) console.warn('[cluster-debug] pop-out:', newlyMovedIds)
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
				const before = clusterModel.runtime.getDetachedCount()
				clusterModel.runtime.detachLeaf(leaf.id)
				// eslint-disable-next-line no-console
				if (DEBUG_CLUSTERING && clusterModel.runtime.getDetachedCount() > before)
					console.warn('[cluster-debug] detached locally:', leaf.id)
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
			// eslint-disable-next-line no-console
			if (DEBUG_CLUSTERING) console.warn('[cluster-debug] rejoin on zoom-out at', zoom.toFixed(3))
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
			debugPartitionDiff(
				`zoom-out adoption at ${zoom.toFixed(3)}`,
				clusterModel.runtime.getVisible(),
				latestModel.runtime.getVisible()
			)
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
	const openThread = openId ? threadsById.get(openId) : null
	const hidden = useValue('comments hidden', () => commentsHidden.get(), [])

	// Reset the transient UI state (open thread, half-placed comment) when this unmounts.
	useEffect(() => {
		return () => {
			openThreadId.set(null)
			pendingComment.set(null)
		}
	}, [])

	// Open the thread named by a deep link (?comment=<thread or comment id>). If the thread is
	// currently inside a cluster, zoom to the first split that reveals it before opening.
	useEffect(() => {
		if (deepLinkHandled.current) return
		const id = new URLSearchParams(window.location.search).get('comment')
		if (!id) {
			deepLinkHandled.current = true
			return
		}

		const record = editor.store.get(id as any)
		if (!record) return

		let thread: TLCommentThread | undefined
		if (record.typeName === 'comment') {
			thread = threadsById.get((record as TLComment).threadId)
		} else if (record.typeName === 'comment-thread') {
			thread = record as TLCommentThread
		}
		if (!thread) return

		deepLinkHandled.current = true
		revealDeepLinkedThread(
			editor,
			thread,
			clusterModel.table,
			clusterZoomBounds,
			impreciseShapeAnchor
		)
		openThreadId.set(thread.id)
	}, [clusterModel.table, clusterZoomBounds, editor, threadsById, impreciseShapeAnchor])

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
			const zoom = clamp(event.zSplit * 1.05, clusterZoomBounds.minZoom, clusterZoomBounds.maxZoom)
			centerOnPointAtZoom(editor, node.centroid, zoom, CLUSTER_EXPAND_ZOOM_MS)
		},
		[clusterModel, clusterZoomBounds, editor]
	)

	// Escape collapses the open thread. Capture-phase + stopPropagation so it runs ahead of the
	// editor (which would otherwise cancel the current tool or clear the selection). If a comment is
	// being edited, let its own Escape handler exit edit mode first, keeping the thread open.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || openThreadId.get() === null) return
			const target = e.target as HTMLElement | null
			if (target && target.closest('.cmt-editing')) return
			openThreadId.set(null)
			e.preventDefault()
			e.stopPropagation()
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [])

	// Shift+C toggles comment-pin visibility on the canvas (matching Figma). Skipped while typing so
	// it never fires from inside a composer. Physical `KeyC` (layout-independent) with shift only.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code !== 'KeyC' || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
			const target = e.target as HTMLElement | null
			if (target && target.closest('input, textarea, [contenteditable="true"]')) return
			toggleCommentsHidden()
			e.preventDefault()
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [])

	// Hidden: the whole canvas layer (pins, open popover, pending composer) is withheld. The signal
	// is read above so this component stays mounted and its shortcut/Escape effects keep running.
	if (hidden) return null

	// Render into the container (above the panels' stacking context) so the pins and popovers
	// live in the UI layer rather than being clipped by the canvas layer.
	return createPortal(
		<div ref={layerRef} className="cmt-canvas-layer">
			{fadeNodes.map(({ node, phase }) => {
				let content: ReactNode
				if (node.count === 1) {
					const thread = threadsById.get(node.id)
					if (!thread) return null
					content = <ThreadPin editor={editor} thread={thread} {...props} />
				} else {
					content = <ClusterBadge editor={editor} node={node} onExpand={zoomToClusterSplit} />
				}
				return (
					<div key={`cluster-fade:${node.id}`} className={clusterFadeClassName(phase)}>
						{content}
					</div>
				)
			})}
			{orphanThreads.map((thread) => (
				<ThreadPin key={thread.id} editor={editor} thread={thread} {...props} />
			))}
			{heldThreads.map((thread) => (
				<ThreadPin key={thread.id} editor={editor} thread={thread} {...props} />
			))}
			{openThread && (
				<ThreadPin key={`open:${openThread.id}`} editor={editor} thread={openThread} {...props} />
			)}
			{pending && props.currentUserId && (
				<PendingComposer editor={editor} pending={pending} {...props} />
			)}
		</div>,
		container
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
	return `cmt-cluster-fade cmt-cluster-fade--${phase}`
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

function revealDeepLinkedThread(
	editor: Editor,
	thread: TLCommentThread,
	table: ClusterTable,
	zoomBounds: { minZoom: number; maxZoom: number },
	impreciseShapeAnchor?: { x: number; y: number }
) {
	if (thread.pageId !== editor.getCurrentPageId()) {
		editor.setCurrentPage(thread.pageId as any)
	}

	const point = anchorPagePoint(editor, thread.anchor, impreciseShapeAnchor)
	if (!point) return

	const parentEvent = findDirectParentEvent(table, thread.id)
	if (
		parentEvent &&
		Number.isFinite(parentEvent.zSplit) &&
		parentEvent.zSplit <= zoomBounds.maxZoom
	) {
		const zoom = clamp(parentEvent.zSplit * 1.05, zoomBounds.minZoom, zoomBounds.maxZoom)
		centerOnPointAtZoom(editor, point, zoom)
		return
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

// Memoized: cluster nodes and thread records are identity-stable while unchanged, so pins and
// badges skip re-rendering when the parent re-renders for reasons that don't concern them
// (leaf recomputes during shape drags, partition changes elsewhere). Camera tracking still
// works — each component subscribes to its own viewport position via signals, not via props.
const ClusterBadge = memo(function ClusterBadge({
	editor,
	node,
	onExpand,
}: {
	editor: Editor
	node: ClusterNode
	onExpand(node: ClusterNode): void
}) {
	const point = useValue(
		'cluster badge point',
		() => {
			const pagePoint = editor.pageToViewport(node.centroid)
			if (!isInInflatedViewport(editor, pagePoint)) return null
			return pagePoint
		},
		[editor, node]
	)

	if (!point) return null

	return (
		<div
			className="cmt-canvas-cluster"
			style={{ left: point.x, top: point.y }}
			onPointerDown={stop}
			onClick={(e) => {
				e.stopPropagation()
				onExpand(node)
			}}
		>
			<CountBadge count={node.count} />
		</div>
	)
})

function isInInflatedViewport(editor: Editor, point: { x: number; y: number }): boolean {
	const viewport = editor.getViewportScreenBounds()
	return (
		point.x >= -CLUSTER_DMAX &&
		point.y >= -CLUSTER_DMAX &&
		point.x <= viewport.w + CLUSTER_DMAX &&
		point.y <= viewport.h + CLUSTER_DMAX
	)
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
		<div ref={ref} className="cmt-canvas-popover" style={style} onPointerDown={stop}>
			{children}
		</div>,
		container
	)
}

const ThreadPin = memo(function ThreadPin({
	editor,
	thread,
	...props
}: CanvasCommentsProps & { editor: Editor; thread: TLCommentThread }) {
	const {
		currentUserId,
		resolveName,
		renderPinContent,
		onPostComment,
		isCommentUnread,
		onCommentRead,
		impreciseShapeAnchor,
	} = props
	const container = useContainer()
	const comments = useThreadComments(editor, thread.id)
	const msg = useTranslation()
	// Only one thread's popover is open at a time — shared across pins via the atom.
	const open = useValue('thread open', () => openThreadId.get() === thread.id, [thread.id])
	const [reply, setReply] = useState<TLRichText>(EMPTY_COMMENT)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editText, setEditText] = useState<TLRichText>(EMPTY_COMMENT)
	// While dragging the marker, its page point overrides the anchor's; committed on drop.
	const [dragPagePoint, setDragPagePoint] = useState<{ x: number; y: number } | null>(null)
	const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null)
	const markerRef = useRef<HTMLDivElement>(null)

	// Clicking outside the open popover (and off its own pin) closes the thread — mirrors the
	// pending composer's dismiss. Capture phase + a class check rather than stopPropagation, since the
	// popover portals elsewhere in the DOM. The pin marker is excluded so its own click-to-toggle
	// handles it instead of this closing then the toggle reopening.
	useEffect(() => {
		if (!open) return
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement | null
			if (!target) return
			if (target.closest('.cmt-canvas-popover')) return
			const marker = markerRef.current
			if (marker && marker.contains(target)) return
			// A click inside a menu/popover layered above us (e.g. the sidebar's filter or overflow
			// dropdown, portaled elsewhere) belongs to that layer — defer to its own dismissal
			// instead of closing the thread out from under it.
			if (target.closest('.tlui-menu, [data-radix-popper-content-wrapper]')) return
			openThreadId.set(null)
		}
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => document.removeEventListener('pointerdown', onPointerDown, true)
	}, [open])

	const point = useValue(
		'pin point',
		() => {
			if (thread.pageId !== editor.getCurrentPageId()) return null
			const pagePoint = anchorPagePoint(editor, thread.anchor, impreciseShapeAnchor)
			return pagePoint ? editor.pageToViewport(pagePoint) : null
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

	if (!point) return null

	const postReply = () => {
		if (isCommentEmpty(reply) || !currentUserId) return
		editor.run(
			() => {
				const comment = createComment({
					threadId: thread.id,
					pageId: thread.pageId,
					authorId: currentUserId,
					body: reply,
				})
				editor.store.put([comment as any])
				if (onPostComment) onPostComment(comment)
			},
			{ history: 'ignore' }
		)
		setReply(EMPTY_COMMENT)
	}

	const toggleResolve = () => {
		if (!currentUserId) return
		editor.run(
			() => {
				editor.store.put([
					{
						...thread,
						resolved: thread.resolved ? null : { at: Date.now(), by: currentUserId },
					} as any,
				])
			},
			{ history: 'ignore' }
		)
	}

	const deleteThread = () => {
		openThreadId.set(null)
		editor.run(() => editor.store.remove([thread.id, ...comments.map((c) => c.id)] as any), {
			history: 'ignore',
		})
	}

	const startEdit = (comment: TLComment) => {
		setEditingId(comment.id)
		setEditText(comment.body)
	}

	const saveEdit = () => {
		const comment = comments.find((c) => c.id === editingId)
		if (!comment || isCommentEmpty(editText)) return
		editor.run(
			() => {
				editor.store.put([{ ...comment, body: editText, editedAt: Date.now() } as any])
			},
			{ history: 'ignore' }
		)
		setEditingId(null)
	}

	// Swap a comment for a pre-filled composer while it's being edited; otherwise show the card,
	// with an edit affordance on your own comments.
	const renderComment = (card: CommentCardProps, index: number): ReactNode => {
		const comment = comments[index]
		if (editingId === comment.id) {
			return (
				<div
					className="cmt-editing"
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
						autoFocus
					/>
				</div>
			)
		}
		return (
			<CommentCard
				{...card}
				actions={
					comment.authorId === currentUserId ? (
						<button
							className="cmt-thread__action"
							title={msg('comments.edit')}
							onClick={() => startEdit(comment)}
						>
							<TldrawUiIcon icon="dots-horizontal" label={msg('comments.edit')} small />
						</button>
					) : undefined
				}
			/>
		)
	}

	const headerActions = (
		<>
			{currentUserId && (
				<button
					className="cmt-thread__action"
					title={msg(thread.resolved ? 'comments.reopen' : 'comments.resolve')}
					onClick={toggleResolve}
				>
					<TldrawUiIcon
						icon="check"
						label={msg(thread.resolved ? 'comments.reopen' : 'comments.resolve')}
						small
					/>
				</button>
			)}
			{currentUserId && (
				<button
					className="cmt-thread__action"
					title={msg('comments.delete')}
					onClick={deleteThread}
				>
					<TldrawUiIcon icon="trash" label={msg('comments.delete')} small />
				</button>
			)}
			<button
				className="cmt-thread__action"
				title={msg('comments.dismiss')}
				onClick={() => openThreadId.set(null)}
			>
				<TldrawUiIcon icon="cross-2" label={msg('comments.dismiss')} small />
			</button>
		</>
	)

	const pinContent = renderPinContent
		? renderPinContent(thread, comments)
		: initialOf(resolveName(thread.createdBy))

	// Drag the marker to move the thread: its position is overridden locally while dragging, then
	// re-anchored on drop (to a shape if dropped on one, else a point). A pointer that barely moves
	// is a click — toggle the popover.
	const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
		e.stopPropagation()
		dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false }
		e.currentTarget.setPointerCapture(e.pointerId)
	}
	const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current
		if (!drag) return
		if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return
		drag.moved = true
		setDragPagePoint(editor.screenToPage({ x: e.clientX, y: e.clientY }))
	}
	const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current
		dragRef.current = null
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId)
		}
		if (!drag) return
		if (!drag.moved) {
			openThreadId.set(openThreadId.get() === thread.id ? null : thread.id)
			return
		}
		const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })
		setDragPagePoint(null)
		const hit = editor.getShapeAtPoint(pagePoint, { hitInside: true })
		const anchor = hit
			? shapeAnchorAt(editor, hit.id, pagePoint, e.altKey)
			: { type: 'point', x: pagePoint.x, y: pagePoint.y }
		editor.run(() => editor.store.put([{ ...thread, anchor } as any]), { history: 'ignore' })
	}

	const renderPoint = dragPagePoint ? editor.pageToViewport(dragPagePoint) : point

	return (
		<div
			className={open ? 'cmt-canvas-pin cmt-canvas-pin--open' : 'cmt-canvas-pin'}
			style={{ left: renderPoint.x, top: renderPoint.y }}
		>
			<div
				ref={markerRef}
				className="cmt-canvas-pin__marker"
				onPointerDown={startDrag}
				onPointerMove={onDrag}
				onPointerUp={endDrag}
			>
				<CommentPin resolved={thread.resolved != null} open={open}>
					{pinContent}
				</CommentPin>
			</div>
			{/* The popover portals up to the menus layer (above the UI panels) so it isn't clipped;
			    the pin itself stays in the canvas-in-front layer, beneath the UI. */}
			{open && (
				<ThreadPopover
					container={container}
					style={{ left: renderPoint.x + 36, top: renderPoint.y - 28 }}
				>
					<CommentThread
						header={msg('comments.thread-title')}
						headerActions={headerActions}
						renderComment={renderComment}
						comments={comments.map((c) => toCardProps(c, props))}
						resolvedBanner={
							thread.resolved
								? msg('comments.resolved-by').replace('{name}', resolveName(thread.resolved.by))
								: undefined
						}
						composer={
							currentUserId && !thread.resolved
								? {
										author: resolveName(currentUserId),
										placeholder: msg('comments.reply-placeholder'),
										sendLabel: msg('comments.send'),
										value: reply,
										onChange: setReply,
										onSubmit: postReply,
										disabled: isCommentEmpty(reply),
									}
								: undefined
						}
					/>
				</ThreadPopover>
			)}
		</div>
	)
})

function PendingComposer({
	editor,
	pending,
	currentUserId,
	resolveName,
	onPostComment,
}: CanvasCommentsProps & { editor: Editor; pending: PendingComment }) {
	const [text, setText] = useState<TLRichText>(EMPTY_COMMENT)
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
			if (el && !el.contains(e.target as Node)) pendingComment.set(null)
		}
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => document.removeEventListener('pointerdown', onPointerDown, true)
	}, [])

	const submit = () => {
		if (isCommentEmpty(text) || !currentUserId) return
		editor.run(
			() => {
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
				editor.store.put([thread as any, comment as any])
				if (onPostComment) onPostComment(comment)
			},
			{ history: 'ignore' }
		)
		setText(EMPTY_COMMENT)
		pendingComment.set(null)
	}

	return createPortal(
		<div
			ref={ref}
			className="cmt-canvas-composer"
			style={{ left: point.x, top: point.y }}
			onPointerDown={stop}
			onKeyDown={(e) => {
				if (e.key === 'Escape') pendingComment.set(null)
			}}
		>
			<CommentComposer
				author={currentUserId ? resolveName(currentUserId) : ''}
				placeholder={msg('comments.add-placeholder')}
				sendLabel={msg('comments.send')}
				value={text}
				onChange={setText}
				onSubmit={submit}
				disabled={isCommentEmpty(text)}
				autoFocus
				leading={draftAvatar}
			/>
		</div>,
		container
	)
}
