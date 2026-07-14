/* eslint-disable tldraw/jsx-no-literals */
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
	react,
	TLComment,
	TLCommentThread,
	TLRichText,
	TldrawUiIcon,
	useContainer,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
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
import { useCommentThreads, usePendingComment, useThreadComments } from './hooks'
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
	/** Where imprecise shape pins sit — a normalized (0–1) spot within the shape. Default top-right. */
	impreciseShapeAnchor?: { x: number; y: number }
}

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

const initialOf = (name: string): string => (name.trim()[0] ?? '?').toUpperCase()
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
	// Threads held out of clustering, rendered as live pins until they rejoin on the next
	// zoom-out. Two ways in: (1) the thread's anchor moved (drag, nudge, align, undo, a
	// collaborator) while it was folded in a badge; (2) the thread was added in the same rebuild
	// as a removal — removals adopt immediately (ghost prevention), and without holding the
	// additions out they would ride that adoption and merge without any zoom. Remote edits are
	// applied in coalesced batches, so mixed add+remove rebuilds are routine in multiplayer.
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
	// Re-clustering only applies while zooming: a rebuilt model (thread added, moved, or closed)
	// is held as `latestModel` and adopted on the next zoom change, so pins never re-flow into
	// clusters under a static camera. Until adoption, threads the rendered model doesn't know
	// about show as plain unclustered pins (`orphanThreads`). Exception: a rebuild that *removed*
	// leaves (thread deleted or opened, page changed) is adopted immediately, so stale pins and
	// badge counts never linger.
	const [renderedModel, setRenderedModel] = useState(latestModel)
	let clusterModel = renderedModel
	// adoptOnRebuild is set by the rejoin reaction below, outside React's render cycle, paired
	// with clearing heldThreadIds. Only trust it once that pairing is actually visible here
	// (heldThreadIds confirmed empty) — an unrelated re-render can land in the gap between the
	// ref being set and the state update it was paired with being applied, and reading the ref
	// on its own there would force-adopt (or wrongly discard the intent to force-adopt) before
	// the rejoin it belongs to has actually happened.
	const rejoinPending = heldThreadIds.size === 0 && adoptOnRebuild.current
	if (
		renderedModel !== latestModel &&
		(rejoinPending || hasRemovedLeaves(renderedModel.table, latestModel.table))
	) {
		// A removal must adopt immediately, but additions must not ride along with it — a rebuild
		// can contain both at once (a coalesced multiplayer batch, or a removal landing while an
		// addition was still deferred), and adopting it whole would merge the additions with no
		// zoom. Hold the added leaves out first: they render as live pins below, the input
		// recomputes without them, and the next render adopts a rebuild that is removal-only.
		// A rejoin adoption is the opposite case — it IS the zoom-out, so additions fold in.
		const addedIds = rejoinPending ? [] : findAddedLeafIds(renderedModel.table, latestModel.table)
		if (addedIds.length > 0) {
			const next = new Set(heldThreadIds)
			for (const id of addedIds) next.add(id)
			setHeldThreadIds(next)
		} else {
			adoptOnRebuild.current = false
			// Carryover seed: events inside their hysteresis band inherit the outgoing partition's
			// merged/unmerged state instead of the geometric-mean tiebreak, so untouched pins never
			// snap together (or apart) just because the model was swapped. Idempotent, so safe to
			// run during render.
			latestModel.runtime.seedFrom(editor.getZoomLevel(), renderedModel.runtime.getVisible())
			setRenderedModel(latestModel)
			clusterModel = latestModel
		}
	} else if (heldThreadIds.size === 0 && renderedModel === latestModel) {
		// Nothing pending and nothing to adopt: any leftover force-adopt intent no longer applies
		// to this (already-synced) model. Clear it so it can't survive to force-adopt a later,
		// unrelated rebuild — this is the actual bug class: a stale true flag firing on some
		// future comment add/move that has nothing to do with the zoom-out that set it.
		adoptOnRebuild.current = false
	}
	// Pop-out detection: a leaf folded inside a badge can't follow its anchor (the badge position
	// is baked into the model), so when its live position drifts from the baked one it ghosts.
	// Marking it moved excludes it from the cluster input, which reads as a removal above and
	// re-clusters the rest of its pile immediately; the pin itself renders live below.
	const newlyMovedIds = findMovedClusteredLeafIds(clusterModel, latestModel)
	if (newlyMovedIds.length > 0) {
		const next = new Set(heldThreadIds)
		for (const id of newlyMovedIds) next.add(id)
		setHeldThreadIds(next)
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
	const orphanThreads = useMemo(() => {
		if (clusterModel === latestModel) return []
		const renderedIds = new Set(clusterModel.table.leaves.map((leaf) => leaf.id))
		const latestIds = new Set(latestModel.table.leaves.map((leaf) => leaf.id))
		return threads.filter((thread) => latestIds.has(thread.id) && !renderedIds.has(thread.id))
	}, [clusterModel, latestModel, threads])
	const heldThreads = useMemo(
		() => threads.filter((thread) => heldThreadIds.has(thread.id) && thread.id !== openId),
		[threads, heldThreadIds, openId]
	)
	// Subscribe to the runtime cursor, not the raw zoom: onCamera runs on every zoom tick (two
	// O(1) threshold checks against the event table) but returns the same integer until a merge
	// or split event actually fires — so this component only re-renders on cluster changes, not
	// on every camera frame.
	const clusterCursor = useValue(
		'comment cluster cursor',
		() => {
			clusterModel.runtime.onCamera(editor.getZoomLevel())
			return clusterModel.runtime.k
		},
		[clusterModel, editor]
	)
	const visibleNodes = useMemo(() => {
		return Array.from(clusterModel.runtime.getVisible().values())
		// The runtime mutates its visible map in place; clusterCursor is its version stamp.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clusterModel, clusterCursor])
	const fadeNodes = useFadeVisibleNodes(visibleNodes, clusterModel)
	const threadsById = useMemo(
		() => new Map<string, TLCommentThread>(threads.map((thread) => [thread.id, thread])),
		[threads]
	)
	const openThread = openId ? threadsById.get(openId) : null

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

function hasRemovedLeaves(rendered: ClusterTable, latest: ClusterTable): boolean {
	if (rendered.leaves.length === 0) return false
	const latestIds = new Set(latest.leaves.map((leaf) => leaf.id))
	return rendered.leaves.some((leaf) => !latestIds.has(leaf.id))
}

/** Leaves present in the latest table but not the rendered one — additions since the rendered
 *  clustering was built (local or remote; the store applies both identically). */
function findAddedLeafIds(rendered: ClusterTable, latest: ClusterTable): string[] {
	const renderedIds = new Set(rendered.leaves.map((leaf) => leaf.id))
	return latest.leaves.filter((leaf) => !renderedIds.has(leaf.id)).map((leaf) => leaf.id)
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
	const { currentUserId, resolveName, renderPinContent, onPostComment, impreciseShapeAnchor } =
		props
	const container = useContainer()
	const comments = useThreadComments(editor, thread.id)
	// Only one thread's popover is open at a time — shared across pins via the atom.
	const open = useValue('thread open', () => openThreadId.get() === thread.id, [thread.id])
	const [reply, setReply] = useState<TLRichText>(EMPTY_COMMENT)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editText, setEditText] = useState<TLRichText>(EMPTY_COMMENT)
	// While dragging the marker, its page point overrides the anchor's; committed on drop.
	const [dragPagePoint, setDragPagePoint] = useState<{ x: number; y: number } | null>(null)
	const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null)

	const point = useValue(
		'pin point',
		() => {
			if (thread.pageId !== editor.getCurrentPageId()) return null
			const pagePoint = anchorPagePoint(editor, thread.anchor, impreciseShapeAnchor)
			return pagePoint ? editor.pageToViewport(pagePoint) : null
		},
		[editor, thread.anchor, thread.pageId, impreciseShapeAnchor]
	)

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
						placeholder="Edit comment…"
						value={editText}
						onChange={setEditText}
						onSubmit={saveEdit}
						sendLabel="Save"
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
						<button className="cmt-thread__action" title="Edit" onClick={() => startEdit(comment)}>
							<TldrawUiIcon icon="dots-horizontal" label="Edit" small />
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
					title={thread.resolved ? 'Reopen' : 'Resolve'}
					onClick={toggleResolve}
				>
					<TldrawUiIcon icon="check" label={thread.resolved ? 'Reopen' : 'Resolve'} small />
				</button>
			)}
			{currentUserId && (
				<button className="cmt-thread__action" title="Delete thread" onClick={deleteThread}>
					<TldrawUiIcon icon="trash" label="Delete thread" small />
				</button>
			)}
			<button className="cmt-thread__action" title="Dismiss" onClick={() => openThreadId.set(null)}>
				<TldrawUiIcon icon="cross-2" label="Dismiss" small />
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
						header="Comment"
						headerActions={headerActions}
						renderComment={renderComment}
						comments={comments.map((c) => toCardProps(c, props))}
						resolvedBy={thread.resolved ? resolveName(thread.resolved.by) : undefined}
						composer={
							currentUserId && !thread.resolved
								? {
										author: resolveName(currentUserId),
										placeholder: 'Reply…',
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
				placeholder="Add a comment…"
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
