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
import { PendingComment } from './comment-tool'
import { useCommentThreads, useThreadComments } from './hooks'
import { useCommentingEnabled } from './license'
import {
	type CommentingComponents,
	type CommentingOptions,
	getCommentingOptions,
	useCommentingOptions,
} from './options'
import {
	commentsHidden,
	openThreadId,
	pendingComment,
	runComment,
	toggleCommentsHidden,
	usePendingComment,
} from './state'
import { anchorPagePoint, shapeAnchorAt } from './thread-state'
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
	/**
	 * Render a comment's body. Defaults to the rich-text body (`<CommentBody>`).
	 * @deprecated Configure the `CommentBody` slot via `CommentTool.configure({ components })` instead.
	 */
	renderBody?(comment: TLComment): ReactNode
	/**
	 * Render a pin's content. Defaults to the thread author's initial.
	 * @deprecated Configure the `PinContent` slot via `CommentTool.configure({ components })` instead.
	 */
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

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

const initialOf = (name: string): string => (getFirstCharacter(name.trim()) || '?').toUpperCase()

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

function toCardProps(
	comment: TLComment,
	props: CanvasCommentsProps,
	components: CommentingComponents
): CommentCardProps {
	const Body = components.CommentBody
	// Back-compat: honor the deprecated `renderBody` prop, read through a structural view so its
	// deprecation doesn't flag every internal use here.
	const renderBody = (props as { renderBody?(comment: TLComment): ReactNode }).renderBody
	// Precedence: legacy render prop > component slot > built-in default.
	const body = renderBody ? (
		renderBody(comment)
	) : Body ? (
		<Body comment={comment} />
	) : (
		<CommentBody richText={comment.body} />
	)
	return {
		author: props.resolveName(comment.authorId),
		body,
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
	const options = useCommentingOptions()
	const container = useContainer()
	const layerRef = useRef<HTMLDivElement>(null)
	// Over the pins and cluster badges, wheel and hover pass through to the canvas beneath (these
	// events bubble up from the pointer-interactive markers to this layer root).
	usePassThroughWheelEvents(layerRef)
	usePassThroughMouseOverEvents(layerRef)
	const deepLinkHandled = useRef(false)
	const threads = useCommentThreads(editor)
	const pending = usePendingComment()
	const openId = useValue('open thread id', () => openThreadId.get(editor), [editor])
	const impreciseShapeAnchor = props.impreciseShapeAnchor ?? options.impreciseShapeAnchor
	// Threads whose anchor has moved (by any means — drag, nudge, align, undo, a collaborator)
	// since the rendered clustering was built. They pop out of clustering and render as live pins,
	// and only rejoin at the next zoom event, when everything re-clusters anyway.
	const [movedThreadIds, setMovedThreadIds] = useState<ReadonlySet<string>>(EMPTY_SET)
	const adoptOnRebuild = useRef(false)
	const clusterLeaves = useValue(
		'comment cluster leaves',
		() =>
			collectClusterLeaves(
				editor,
				threads.filter((thread) => !movedThreadIds.has(thread.id)),
				openThreadId.get(editor),
				impreciseShapeAnchor
			),
		[editor, threads, impreciseShapeAnchor, movedThreadIds]
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
	if (
		renderedModel !== latestModel &&
		(adoptOnRebuild.current || hasRemovedLeaves(renderedModel.table, latestModel.table))
	) {
		adoptOnRebuild.current = false
		// Carryover seed: events inside their hysteresis band inherit the outgoing partition's
		// merged/unmerged state instead of the geometric-mean tiebreak, so untouched pins never
		// snap together (or apart) just because the model was swapped. Idempotent, so safe to
		// run during render.
		latestModel.runtime.seedFrom(editor.getZoomLevel(), renderedModel.runtime.getVisible())
		setRenderedModel(latestModel)
		clusterModel = latestModel
	}
	// Pop-out detection: a leaf folded inside a badge can't follow its anchor (the badge position
	// is baked into the model), so when its live position drifts from the baked one it ghosts.
	// Marking it moved excludes it from the cluster input, which reads as a removal above and
	// re-clusters the rest of its pile immediately; the pin itself renders live below.
	const newlyMovedIds = findMovedClusteredLeafIds(clusterModel, latestModel)
	if (newlyMovedIds.length > 0) {
		// eslint-disable-next-line no-console
		console.debug(`[comments] pins popped out of clustering: ${newlyMovedIds.join(', ')}`)
		const next = new Set(movedThreadIds)
		for (const id of newlyMovedIds) next.add(id)
		setMovedThreadIds(next)
	}
	// Moved pins rejoin clustering on the next zoom-out motion: clear the set (so the rebuild
	// includes them again) and adopt that rebuild immediately instead of deferring it. Zooming in
	// never folds pins into clusters — merging is a zoom-out-only move, matching the runtime.
	useEffect(() => {
		if (movedThreadIds.size === 0) return
		let lastZoom = editor.getZoomLevel()
		return react('rejoin moved comment pins on zoom out', () => {
			const zoom = editor.getZoomLevel()
			const prevZoom = lastZoom
			lastZoom = zoom
			if (zoom >= prevZoom) return
			adoptOnRebuild.current = true
			setMovedThreadIds(EMPTY_SET)
		})
	}, [movedThreadIds, editor])
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
	const movedThreads = useMemo(
		() => threads.filter((thread) => movedThreadIds.has(thread.id) && thread.id !== openId),
		[threads, movedThreadIds, openId]
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
		const nodes = Array.from(clusterModel.runtime.getVisible().values())
		// eslint-disable-next-line no-console
		console.debug(
			`[comments] cluster cursor k=${clusterCursor} → re-rendering ${nodes.length} visible nodes`
		)
		return nodes
	}, [clusterModel, clusterCursor])
	const fadeNodes = useFadeVisibleNodes(visibleNodes, clusterModel, options.clusterFadeMs)
	const threadsById = useMemo(
		() => new Map<string, TLCommentThread>(threads.map((thread) => [thread.id, thread])),
		[threads]
	)
	const openThread = openId ? threadsById.get(openId) : null
	const hidden = useValue('comments hidden', () => commentsHidden.get(editor), [editor])

	// Reset the transient UI state (open thread, half-placed comment) when this unmounts.
	useEffect(() => {
		return () => {
			openThreadId.set(editor, null)
			pendingComment.set(editor, null)
		}
	}, [editor])

	// Open the thread named by a deep link (?comment=<thread or comment id>). If the thread is
	// currently inside a cluster, zoom to the first split that reveals it before opening.
	useEffect(() => {
		if (deepLinkHandled.current) return
		if (!options.enableDeepLinks) {
			deepLinkHandled.current = true
			return
		}
		const id = new URLSearchParams(window.location.search).get(options.deepLinkParam)
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
		revealDeepLinkedThread(editor, thread, clusterModel.table, clusterZoomBounds, options)
		openThreadId.set(editor, thread.id)
	}, [clusterModel.table, clusterZoomBounds, editor, threadsById, impreciseShapeAnchor, options])

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
			centerOnPointAtZoom(editor, node.centroid, zoom, options.clusterExpandZoomMs)
		},
		[clusterModel, clusterZoomBounds, editor, options]
	)

	// Escape collapses the open thread. Capture-phase + stopPropagation so it runs ahead of the
	// editor (which would otherwise cancel the current tool or clear the selection). If a comment is
	// being edited, let its own Escape handler exit edit mode first, keeping the thread open.
	useEffect(() => {
		if (!options.closeThreadOnEscape) return
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || openThreadId.get(editor) === null) return
			const target = e.target as HTMLElement | null
			if (target && target.closest('.cmt-editing')) return
			openThreadId.set(editor, null)
			e.preventDefault()
			e.stopPropagation()
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [editor, options.closeThreadOnEscape])

	// Shift+C toggles comment-pin visibility on the canvas (matching Figma). Skipped while typing so
	// it never fires from inside a composer. Physical `KeyC` (layout-independent) with shift only.
	useEffect(() => {
		if (!options.enableVisibilityShortcut) return
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code !== 'KeyC' || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
			const target = e.target as HTMLElement | null
			if (target && target.closest('input, textarea, [contenteditable="true"]')) return
			toggleCommentsHidden(editor)
			e.preventDefault()
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [editor, options.enableVisibilityShortcut])

	// Hidden: the whole canvas layer (pins, open popover, pending composer) is withheld. The signal
	// is read above so this component stays mounted and its shortcut/Escape effects keep running.
	if (hidden) return null

	// Render into the container (above the panels' stacking context) so the pins and popovers
	// live in the UI layer rather than being clipped by the canvas layer.
	return createPortal(
		<div ref={layerRef} className="cmt-canvas-layer">
			{options.enableClustering ? (
				<>
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
					{movedThreads.map((thread) => (
						<ThreadPin key={thread.id} editor={editor} thread={thread} {...props} />
					))}
				</>
			) : (
				// Clustering off: every thread renders as its own live pin (each returns null when it's
				// not on the current page or its anchor is missing).
				threads.map((thread) => (
					<ThreadPin key={thread.id} editor={editor} thread={thread} {...props} />
				))
			)}
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
	resetKey: { runtime: ClusterRuntime; table: ClusterTable },
	fadeMs: number
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
		}, fadeMs)
		return () => window.clearTimeout(timeout)
	}, [hasExiting, renderedNodes, fadeMs])

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
	options: CommentingOptions
) {
	if (thread.pageId !== editor.getCurrentPageId()) {
		editor.setCurrentPage(thread.pageId as any)
	}

	const point = anchorPagePoint(editor, thread.anchor, options.impreciseShapeAnchor)
	if (!point) return

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
		centerOnPointAtZoom(editor, point, zoom, options.focusAnimationMs)
		return
	}

	editor.centerOnPoint(point, { animation: { duration: options.focusAnimationMs } })
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
	const margin = getCommentingOptions(editor).clusterCullMargin
	return (
		point.x >= -margin &&
		point.y >= -margin &&
		point.x <= viewport.w + margin &&
		point.y <= viewport.h + margin
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
	const { currentUserId, resolveName, onPostComment, isCommentUnread, onCommentRead } = props
	const options = useCommentingOptions()
	const impreciseShapeAnchor = props.impreciseShapeAnchor ?? options.impreciseShapeAnchor
	const container = useContainer()
	const comments = useThreadComments(editor, thread.id)
	const msg = useTranslation()
	// Only one thread's popover is open at a time — shared across pins via the atom.
	const open = useValue('thread open', () => openThreadId.get(editor) === thread.id, [
		editor,
		thread.id,
	])
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
		runComment(editor, () => {
			const comment = createComment({
				threadId: thread.id,
				pageId: thread.pageId,
				authorId: currentUserId,
				body: reply,
			})
			editor.store.put([comment as any])
			if (onPostComment) onPostComment(comment)
		})
		setReply(EMPTY_COMMENT)
	}

	const toggleResolve = () => {
		if (!currentUserId) return
		runComment(editor, () => {
			editor.store.put([
				{
					...thread,
					resolved: thread.resolved ? null : { at: Date.now(), by: currentUserId },
				} as any,
			])
		})
	}

	const deleteThread = () => {
		openThreadId.set(editor, null)
		runComment(editor, () => editor.store.remove([thread.id, ...comments.map((c) => c.id)] as any))
	}

	const startEdit = (comment: TLComment) => {
		setEditingId(comment.id)
		setEditText(comment.body)
	}

	const saveEdit = () => {
		const comment = comments.find((c) => c.id === editingId)
		if (!comment || isCommentEmpty(editText)) return
		runComment(editor, () => {
			editor.store.put([{ ...comment, body: editText, editedAt: Date.now() } as any])
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
					options.enableEdit && comment.authorId === currentUserId ? (
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
			{currentUserId && options.enableResolve && (
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
			{currentUserId && options.enableDelete && (
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
				onClick={() => openThreadId.set(editor, null)}
			>
				<TldrawUiIcon icon="cross-2" label={msg('comments.dismiss')} small />
			</button>
		</>
	)

	const PinContent = options.components.PinContent
	// Back-compat: honor the deprecated `renderPinContent` prop (structural view; see toCardProps).
	const renderPinContent = (
		props as { renderPinContent?(thread: TLCommentThread, comments: TLComment[]): ReactNode }
	).renderPinContent
	// Precedence: legacy render prop > component slot > built-in default (author initial).
	const pinContent = renderPinContent ? (
		renderPinContent(thread, comments)
	) : PinContent ? (
		<PinContent thread={thread} comments={comments} />
	) : (
		initialOf(resolveName(thread.createdBy))
	)

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
		// Drag-to-move disabled: never promote to a move, so endDrag reads it as a click (toggle).
		if (!options.enableDragToMove) return
		if (
			!drag.moved &&
			Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < options.dragThreshold
		)
			return
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
			openThreadId.set(editor, openThreadId.get(editor) === thread.id ? null : thread.id)
			return
		}
		const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })
		setDragPagePoint(null)
		const hit = editor.getShapeAtPoint(pagePoint, { hitInside: true })
		const anchor = hit
			? shapeAnchorAt(editor, hit.id, pagePoint, e.altKey)
			: { type: 'point', x: pagePoint.x, y: pagePoint.y }
		runComment(editor, () => editor.store.put([{ ...thread, anchor } as any]), 'drag')
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
						comments={comments.map((c) => toCardProps(c, props, options.components))}
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
			if (el && !el.contains(e.target as Node)) pendingComment.set(editor, null)
		}
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => document.removeEventListener('pointerdown', onPointerDown, true)
	}, [editor])

	const submit = () => {
		if (isCommentEmpty(text) || !currentUserId) return
		runComment(editor, () => {
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
		})
		setText(EMPTY_COMMENT)
		pendingComment.set(editor, null)
	}

	return createPortal(
		<div
			ref={ref}
			className="cmt-canvas-composer"
			style={{ left: point.x, top: point.y }}
			onPointerDown={stop}
			onKeyDown={(e) => {
				if (e.key === 'Escape') pendingComment.set(editor, null)
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
