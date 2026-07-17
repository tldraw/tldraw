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
	TldrawUiIcon,
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
import { CommentCard, CommentCardProps } from '../ui/comment-card'
import { CommentComposer } from '../ui/comment-composer'
import { EMPTY_COMMENT, isCommentEmpty } from '../ui/comment-extensions'
import { CommentPin } from '../ui/comment-pin'
import { CommentThread } from '../ui/comment-thread'
import { CountBadge } from '../ui/count-badge'
import { MentionMember } from '../ui/mention-list'
import { isMentionPickerOpen } from '../ui/mention-suggestion'
import { collectClusterLeaves } from './cluster-input'
import { CommentBody } from './comment-body'
import { UNKNOWN_AUTHOR } from './comment-render'
import { getCommentRecord, putCommentRecords, removeCommentRecords } from './comment-store'
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
	DEFAULT_REGION_COMMENT_OPTIONS,
	RegionCommentOptions,
	setRegionCommentOptions,
} from './region-options'
import {
	commentsHidden,
	commitCommentMutation,
	openThreadId,
	pendingComment,
	regionDraft,
	toggleCommentsHidden,
	usePendingComment,
} from './state'
import { anchorPagePoint, regionPinPoint, shapeAnchorAt } from './thread-state'

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
	/** Map an author id to a display name, or `undefined` when the id can't be named. */
	resolveName(id: string): string | undefined
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
	/** Region comment behaviour. Region is off by default — omit this for click-only point/shape
	 *  comments. Anything unset falls back to {@link DEFAULT_REGION_COMMENT_OPTIONS}. */
	regionOptions?: Partial<RegionCommentOptions>
}

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

const initialOf = (name: string): string => (getFirstCharacter(name.trim()) || '?').toUpperCase()
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

function toCardProps(
	comment: TLComment,
	props: CanvasCommentsProps,
	components: CommentingComponents
): CommentCardProps {
	const Body = components.CommentBody
	// The `CommentBody` component slot overrides the built-in rich-text default (which resolves
	// mention ids to names).
	const body = Body ? (
		<Body comment={comment} />
	) : (
		<CommentBody richText={comment.body} resolveName={props.resolveName} />
	)
	return {
		author: props.resolveName(comment.authorId) ?? UNKNOWN_AUTHOR,
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
	// Merge the consumer's region options over the disabled defaults and publish them for this editor,
	// so the comment tool (which has no props) reads the same per-instance config.
	const regionOptions = useMemo(
		() => ({ ...DEFAULT_REGION_COMMENT_OPTIONS, ...props.regionOptions }),
		[props.regionOptions]
	)
	useEffect(() => setRegionCommentOptions(editor, regionOptions), [editor, regionOptions])
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
	const fadeNodes = useFadeVisibleNodes(visibleNodes, clusterModel)
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
		const id = new URLSearchParams(window.location.search).get('comment')
		if (!id) {
			deepLinkHandled.current = true
			return
		}

		const record = getCommentRecord(editor, id)
		if (!record) return

		let thread: TLCommentThread | undefined
		if (record.typeName === 'comment') {
			thread = threadsById.get(record.threadId)
		} else {
			thread = record
		}
		if (!thread) return

		deepLinkHandled.current = true
		revealDeepLinkedThread(
			editor,
			thread,
			clusterModel.table,
			clusterZoomBounds,
			options,
			impreciseShapeAnchor
		)
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
			centerOnPointAtZoom(editor, node.centroid, zoom, CLUSTER_EXPAND_ZOOM_MS)
		},
		[clusterModel, clusterZoomBounds, editor, options]
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
			if (target && target.closest('.cmt-editing')) return
			openThreadId.set(editor, null)
			e.preventDefault()
			e.stopPropagation()
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [editor])

	// Shift+C toggles comment-pin visibility on the canvas (matching Figma). Skipped while typing so
	// it never fires from inside a composer. Physical `KeyC` (layout-independent) with shift only.
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
		<div ref={layerRef} className="cmt-canvas-layer">
			{options.enableClustering ? (
				<>
					{fadeNodes.map(({ node, phase }) => {
						let content: ReactNode
						if (node.count === 1) {
							const thread = threadsById.get(node.id)
							if (!thread) return null
							content = (
								<ThreadPin
									editor={editor}
									thread={thread}
									{...props}
									regionOptions={regionOptions}
								/>
							)
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
						<ThreadPin
							key={thread.id}
							editor={editor}
							thread={thread}
							{...props}
							regionOptions={regionOptions}
						/>
					))}
					{movedThreads.map((thread) => (
						<ThreadPin
							key={thread.id}
							editor={editor}
							thread={thread}
							{...props}
							regionOptions={regionOptions}
						/>
					))}
				</>
			) : (
				// Clustering off: every thread renders as its own live pin (each returns null when it's
				// not on the current page or its anchor is missing). The open thread is excluded here and
				// rendered once below, mirroring how the clustering path keeps it out of the cluster leaves —
				// otherwise it would mount a second, stacked pin.
				threads
					.filter((thread) => thread.id !== openId)
					.map((thread) => (
						<ThreadPin
							key={thread.id}
							editor={editor}
							thread={thread}
							{...props}
							regionOptions={regionOptions}
						/>
					))
			)}
			{openThread && (
				<ThreadPin
					key={`open:${openThread.id}`}
					editor={editor}
					thread={openThread}
					{...props}
					regionOptions={regionOptions}
				/>
			)}
			<RegionDraftBox editor={editor} />
			{/* Keep the region visible while composing — the drag draft is gone by now, and no thread
			    exists yet, so the pending anchor is what shows the area under the open composer. */}
			{pending?.anchor.type === 'region' && <RegionBox editor={editor} box={pending.anchor} />}
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

/** A dashed rectangle over a region anchor's bounds, in viewport space. Sits in the canvas layer as
 *  a sibling of the pins. `pointer-events` stays off (canvas interaction passes through) unless
 *  `movable`, in which case dragging the body translates the region — previews live, commits on drop. */
function RegionBox({
	editor,
	box,
	movable,
	onPreview,
	onCommit,
}: {
	editor: Editor
	box: BoxModel
	movable?: boolean
	onPreview?(bounds: BoxModel | null): void
	onCommit?(bounds: BoxModel): void
}) {
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
	// The grab point and the box at grab time, captured so the drag translates by a stable delta even
	// as the box prop reflows under the live preview.
	const grabRef = useRef<{ page: VecLike; box: BoxModel } | null>(null)
	const translated = (e: ReactPointerEvent<HTMLDivElement>): BoxModel => {
		const g = grabRef.current!
		const p = editor.screenToPage({ x: e.clientX, y: e.clientY })
		return { ...g.box, x: g.box.x + (p.x - g.page.x), y: g.box.y + (p.y - g.page.y) }
	}
	const startMove = (e: ReactPointerEvent<HTMLDivElement>) => {
		e.stopPropagation()
		grabRef.current = { page: editor.screenToPage({ x: e.clientX, y: e.clientY }), box }
		e.currentTarget.setPointerCapture(e.pointerId)
	}
	const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
		if (grabRef.current) onPreview?.(translated(e))
	}
	const endMove = (e: ReactPointerEvent<HTMLDivElement>) => {
		if (!grabRef.current) return
		const bounds = translated(e)
		grabRef.current = null
		if (e.currentTarget.hasPointerCapture(e.pointerId))
			e.currentTarget.releasePointerCapture(e.pointerId)
		onCommit?.(bounds)
	}
	return (
		<div
			className={movable ? 'cmt-canvas-region cmt-canvas-region--movable' : 'cmt-canvas-region'}
			style={rect}
			onPointerDown={movable ? startMove : undefined}
			onPointerMove={movable ? onMove : undefined}
			onPointerUp={movable ? endMove : undefined}
		/>
	)
}

/** The live region being dragged out by the comment tool, or nothing when not dragging. */
function RegionDraftBox({ editor }: { editor: Editor }) {
	const box = useValue('region draft', () => regionDraft.get(editor), [editor])
	if (!box) return null
	return <RegionBox editor={editor} box={box} />
}

// A resize handle's normalized 0–1 spot on the box, and its cursor. An axis at 0.5 (a side midpoint)
// is *not* controlled by that handle: corners resize both axes, edges resize only their own.
interface RegionHandle {
	x: number
	y: number
	cursor: string
}

// The four corners (both axes) and the four side midpoints (one axis each).
const REGION_CORNERS: readonly RegionHandle[] = [
	{ x: 0, y: 0, cursor: 'nwse-resize' },
	{ x: 1, y: 0, cursor: 'nesw-resize' },
	{ x: 0, y: 1, cursor: 'nesw-resize' },
	{ x: 1, y: 1, cursor: 'nwse-resize' },
]
const REGION_EDGES: readonly RegionHandle[] = [
	{ x: 0.5, y: 0, cursor: 'ns-resize' },
	{ x: 1, y: 0.5, cursor: 'ew-resize' },
	{ x: 0.5, y: 1, cursor: 'ns-resize' },
	{ x: 0, y: 0.5, cursor: 'ew-resize' },
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
					className="cmt-canvas-region-handle"
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
	regionOptions,
	...props
}: Omit<CanvasCommentsProps, 'regionOptions'> & {
	editor: Editor
	thread: TLCommentThread
	regionOptions: RegionCommentOptions
}) {
	const {
		currentUserId,
		resolveName,
		onPostComment,
		isCommentUnread,
		onCommentRead,
		getMentionSuggestions,
		renderMentionSuggestion,
	} = props
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
	// The live bounds while a corner handle is resizing the region, else null.
	const [resizeBounds, setResizeBounds] = useState<BoxModel | null>(null)
	// Whether the pin marker is hovered — only consulted by the 'pin-hover' reveal mode.
	const [pinHovered, setPinHovered] = useState(false)
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
	// A region's box and handles are revealed while open or mid-resize, plus — per the reveal mode —
	// while the pointer is within the region ('pointer') or the pin is hovered ('pin-hover').
	const revealed =
		open ||
		resizeBounds != null ||
		(regionOptions.reveal === 'pointer' && pointerInRegion) ||
		(regionOptions.reveal === 'pin-hover' && pinHovered)
	// The resize handles: side midpoints ('edges'), or the corners other than the pin's ('corners').
	const resizeHandles = useMemo(
		() =>
			regionOptions.resize === 'edges'
				? REGION_EDGES
				: REGION_CORNERS.filter(
						(c) => c.x !== regionOptions.pinCorner.x || c.y !== regionOptions.pinCorner.y
					),
		[regionOptions.resize, regionOptions.pinCorner]
	)
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
			// A press on a region's resize handle or movable body edits this thread — don't dismiss it.
			if (target.closest('.cmt-canvas-region-handle, .cmt-canvas-region--movable')) return
			// A click inside a menu/popover layered above us (the sidebar's filter or overflow
			// dropdown, or the composer's mention picker — all portaled elsewhere) belongs to that
			// layer; defer to its own dismissal instead of closing the thread out from under it.
			if (target.closest('.tlui-menu, [data-radix-popper-content-wrapper], .cmt-mention-popup'))
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
				onClick={() => openThreadId.set(editor, null)}
			>
				<TldrawUiIcon icon="cross-2" label={msg('comments.dismiss')} small />
			</button>
		</>
	)

	const PinContent = options.components.PinContent
	// The `PinContent` component slot overrides the built-in author-initial default.
	const pinContent = PinContent ? (
		<PinContent thread={thread} comments={comments} />
	) : (
		initialOf(resolveName(thread.createdBy) ?? UNKNOWN_AUTHOR)
	)

	// Drag the marker to move the thread: its position is overridden locally while dragging, then
	// re-anchored on drop. A point/shape thread re-anchors to whatever it's dropped on (a shape, else
	// a point); a region thread translates, keeping its size. A pointer that barely moves is a click —
	// toggle the popover.
	// Which affordances move a region, per the option: 'pin' → pin only, 'body' → body only, 'both'.
	const isRegion = thread.anchor.type === 'region'
	const pinMovable = regionOptions.move !== 'body'
	const bodyMovable = regionOptions.move !== 'pin'
	const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
		e.stopPropagation()
		dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false }
		e.currentTarget.setPointerCapture(e.pointerId)
	}
	const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current
		if (!drag) return
		// A region that moves by its body ignores pin drags (the pin only toggles the thread).
		if (isRegion && !pinMovable) return
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
			openThreadId.set(editor, openThreadId.get(editor) === thread.id ? null : thread.id)
			return
		}
		const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })
		setDragPagePoint(null)
		let anchor: TLCommentThread['anchor']
		if (thread.anchor.type === 'region') {
			// Translate so the pin (the region's pin corner) lands at the drop; size unchanged.
			anchor = {
				...thread.anchor,
				x: pagePoint.x - regionOptions.pinCorner.x * thread.anchor.w,
				y: pagePoint.y - regionOptions.pinCorner.y * thread.anchor.h,
			}
		} else {
			const hit = editor.getShapeAtPoint(pagePoint, { hitInside: true })
			anchor = hit
				? shapeAnchorAt(editor, [hit.id], pagePoint, e.altKey)
				: { type: 'point', x: pagePoint.x, y: pagePoint.y }
		}
		commitCommentMutation(editor, () => putCommentRecords(editor, [{ ...thread, anchor }]), 'drag')
	}

	// The pin (and its popover) track the live edit: a resize moves it to the region's pin corner, a
	// move to the drag point; otherwise it sits at the stored anchor's viewport point.
	const livePinPage = resizeBounds
		? regionPinPoint(resizeBounds, regionOptions.pinCorner)
		: dragPagePoint
	const renderPoint = livePinPage ? editor.pageToViewport(livePinPage) : point

	// A region's live box bounds, by priority: a corner resize, else a pin-drag translation (the pin
	// corner tracks the cursor), else the stored anchor. Undefined for non-region threads.
	const regionAnchor = thread.anchor.type === 'region' ? thread.anchor : undefined
	const movedRegion =
		regionAnchor && dragPagePoint
			? {
					...regionAnchor,
					x: dragPagePoint.x - regionOptions.pinCorner.x * regionAnchor.w,
					y: dragPagePoint.y - regionOptions.pinCorner.y * regionAnchor.h,
				}
			: regionAnchor
	const regionBoxBounds = resizeBounds ?? movedRegion
	const commitResize = (bounds: BoxModel) => {
		setResizeBounds(null)
		editor.run(
			() => putCommentRecords(editor, [{ ...thread, anchor: { type: 'region', ...bounds } }]),
			{
				history: 'ignore',
			}
		)
	}

	return (
		<>
			{regionBoxBounds && (dragPagePoint || revealed) && (
				<RegionBox
					editor={editor}
					box={regionBoxBounds}
					movable={bodyMovable && !dragPagePoint}
					onPreview={setResizeBounds}
					onCommit={commitResize}
				/>
			)}
			{regionBoxBounds && revealed && !dragPagePoint && regionOptions.resize !== 'none' && (
				<RegionResizeHandles
					editor={editor}
					box={regionBoxBounds}
					handles={resizeHandles}
					onPreview={setResizeBounds}
					onCommit={commitResize}
				/>
			)}
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
					onPointerEnter={() => setPinHovered(true)}
					onPointerLeave={() => setPinHovered(false)}
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
									? msg('comments.resolved-by').replace(
											'{name}',
											resolveName(thread.resolved.by) ?? UNKNOWN_AUTHOR
										)
									: undefined
							}
							composer={
								currentUserId && !thread.resolved
									? {
											author: resolveName(currentUserId) ?? UNKNOWN_AUTHOR,
											placeholder: msg('comments.reply-placeholder'),
											sendLabel: msg('comments.send'),
											value: reply,
											onChange: setReply,
											onSubmit: postReply,
											disabled: isCommentEmpty(reply),
											getMentionSuggestions,
											renderMentionSuggestion,
										}
									: undefined
							}
						/>
					</ThreadPopover>
				)}
			</div>
		</>
	)
})

function PendingComposer({
	editor,
	pending,
	currentUserId,
	resolveName,
	onPostComment,
	getMentionSuggestions,
	renderMentionSuggestion,
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
			const target = e.target as HTMLElement | null
			if (!el || !target) return
			// A click in the composer, or in the mention picker it spawns (portaled elsewhere), is
			// not "outside" — keep the draft open so the pick can insert.
			if (el.contains(target) || target.closest('.cmt-mention-popup')) return
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
		pendingComment.set(editor, null)
	}

	return createPortal(
		<div
			ref={ref}
			className="cmt-canvas-composer"
			style={{ left: point.x, top: point.y }}
			onPointerDown={stop}
			onKeyDown={(e) => {
				if (e.key === 'Escape' && !isMentionPickerOpen()) pendingComment.set(editor, null)
			}}
		>
			<CommentComposer
				author={currentUserId ? (resolveName(currentUserId) ?? UNKNOWN_AUTHOR) : ''}
				placeholder={msg('comments.add-placeholder')}
				sendLabel={msg('comments.send')}
				value={text}
				onChange={setText}
				onSubmit={submit}
				disabled={isCommentEmpty(text)}
				getMentionSuggestions={getMentionSuggestions}
				renderMentionSuggestion={renderMentionSuggestion}
				autoFocus
				leading={draftAvatar}
			/>
		</div>,
		container
	)
}
