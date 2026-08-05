import { useEffect, useMemo, useRef, useState } from 'react'
import { Editor, react, TLCommentThread, useValue } from 'tldraw'
import { computeClusterTable } from '../clustering/computeClusterTable'
import { type ClusterRuntime, createClusterRuntime } from '../clustering/runtime'
import type { ClusterNode, ClusterTable, MergeEvent } from '../clustering/types'
import { type ClusterFadeNode, useFadeVisibleNodes } from './cluster-fade'
import {
	type ClusterInput,
	clusterInputEqual,
	clusterInputIdsEqual,
	collectClusterLeaves,
} from './cluster-input'
import { type CommentingOptions } from './options'
import { openThreadId } from './state'
import { anchorPagePoint, commentCenterScreenOffset } from './thread-state'

/** Duration of the click-a-badge zoom-to-split animation. */
export const CLUSTER_EXPAND_ZOOM_MS = 450
/** How far past a cluster's split zoom to land when expanding it — a 5% overshoot, so the badge
 *  lands clear of the threshold it just crossed rather than flickering on it. */
const CLUSTER_SPLIT_ZOOM_FACTOR = 1.05

const EMPTY_SET: ReadonlySet<string> = new Set()
const MOVED_LEAF_EPSILON = 1e-6

/** Default select-tool states that move shapes continuously, one store write per pointermove. A
 *  custom tool in their place just never matches, falling back to a rebuild per frame. */
const SHAPE_DRAG_STATE_PATHS = [
	'select.translating',
	'select.resizing',
	'select.rotating',
	'select.dragging_handle',
	'select.crop.cropping',
] as const

/** Reactive: `isInAny` reads the tool state path, so a computed reading this re-evaluates when the
 *  gesture starts or settles. */
function isShapeDragInProgress(editor: Editor): boolean {
	return editor.isInAny(...SHAPE_DRAG_STATE_PATHS)
}

/** The clustering table for the current scene, plus the runtime walking its merge events. */
export interface ClusterModel {
	runtime: ClusterRuntime
	table: ClusterTable
}

export interface ClusterZoomBounds {
	minZoom: number
	maxZoom: number
}

export interface ClusterModelState {
	/** The partition actually on screen. See {@link useClusterModel} for why it can lag the input. */
	model: ClusterModel
	zoomBounds: ClusterZoomBounds
	/** The displayed nodes, each tagged with its cross-fade phase. */
	fadeNodes: ClusterFadeNode[]
	/** Threads in the input that the displayed partition doesn't show — render them as plain pins. */
	orphanThreads: TLCommentThread[]
	/** Threads held out of clustering because their anchor moved while folded into a badge. */
	heldThreads: TLCommentThread[]
}

/**
 * The clustering state machine behind the comments layer.
 *
 * The core invariant: the only thing that re-flows clustering doc-wide is zoom. Every rebuild is
 * computed immediately as `latestModel`, but the on-screen partition is `renderedModel`, which only
 * changes via (a) the cursor walking on zoom, (b) adoption of the pending rebuild on zoom-out, or
 * (c) LOCAL detach patches, where a leaf that left the input is detached from its own badge in
 * place and nothing else on the canvas moves.
 *
 * Threads the displayed partition can't represent are returned separately (`orphanThreads`,
 * `heldThreads`) for the layer to draw as ordinary pins.
 */
export function useClusterModel(
	editor: Editor,
	threads: readonly TLCommentThread[],
	openId: string | null
): ClusterModelState {
	// Threads held out of clustering because their anchor moved while folded inside a badge
	// (drag, nudge, align, undo, a collaborator — detected by position, not gesture). They render
	// as live pins riding their anchor and rejoin clustering on the next zoom-out.
	const [heldThreadIds, setHeldThreadIds] = useState<ReadonlySet<string>>(EMPTY_SET)
	const adoptOnRebuild = useRef(false)
	// This input's identity keys the O(N²) table rebuild below, so it's gated on value equality: a
	// reply, a reaction, a resolve — anything that touches comment records without moving a pin —
	// returns the previous input and rebuilds nothing.
	//
	// Mid-drag the gate ignores positions too — except a folded leaf's, which a badge can't
	// follow. Its first move passes through, the pop-out below holds the pin out as a live pin,
	// and the input is static again for the rest of the drag.
	const clusterInputRef = useRef<ClusterInput>({ leaves: [], screenOffsets: undefined })
	const renderedModelRef = useRef<ClusterModel | null>(null)
	const clusterInput = useValue(
		'comment cluster leaves',
		() => {
			const next = collectClusterLeaves(
				editor,
				threads.filter((thread) => !heldThreadIds.has(thread.id)),
				openThreadId.get(editor)
			)
			const prev = clusterInputRef.current
			if (
				isShapeDragInProgress(editor) &&
				clusterInputIdsEqual(prev, next) &&
				!anyFoldedLeafMoved(prev, next, renderedModelRef.current)
			) {
				return prev
			}
			if (clusterInputEqual(prev, next)) return prev
			clusterInputRef.current = next
			return next
		},
		[editor, threads, heldThreadIds]
	)
	const clusterZoomBounds = useValue(
		'comment cluster zoom bounds',
		() => getClusterZoomBounds(editor),
		[editor]
	)
	const latestModel = useMemo(() => {
		const table = computeClusterTable(
			clusterInput.leaves,
			clusterZoomBounds,
			clusterInput.screenOffsets
		)
		const runtime = createClusterRuntime(table)
		runtime.seed(editor.getZoomLevel())
		return { runtime, table }
	}, [clusterInput, clusterZoomBounds, editor])
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
	// adoptOnRebuild is set outside React's render cycle, paired with clearing heldThreadIds. Only trust
	// it once that pairing is visible here, or an unrelated re-render can land in the gap.
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
	// For the input gate above: folded-vs-visible is judged against what's on screen.
	renderedModelRef.current = clusterModel
	// Pop-out detection: a leaf folded inside a badge can't follow its anchor (the badge position
	// is baked into the model), so when its live position drifts from the baked one, hold it out.
	// It renders as a live pin riding the anchor; the detach loop below shrinks its badge locally.
	const newlyMovedIds = findMovedClusteredLeafIds(clusterModel, latestModel)
	if (newlyMovedIds.length > 0) {
		const next = new Set(heldThreadIds)
		for (const id of newlyMovedIds) next.add(id)
		setHeldThreadIds(next)
	}
	// Local partition maintenance — the only non-zoom visual change. Any displayed leaf that has left the
	// cluster input is detached from its badge in place; the corrected rebuild already sits in latestModel
	// awaiting the next zoom-out. When the two models match, the leaf sets are identical, so skip the scan.
	if (clusterModel !== latestModel) {
		const latestLeafIds = new Set(latestModel.table.leaves.map((leaf) => leaf.id))
		const removedLeafIds: string[] = []
		for (const leaf of clusterModel.table.leaves) {
			if (!latestLeafIds.has(leaf.id)) {
				removedLeafIds.push(leaf.id)
			}
		}
		// Batched: one patch rebuild and one version bump for the whole set.
		if (removedLeafIds.length > 0) clusterModel.runtime.detachLeaves(removedLeafIds)
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
	// Threads the displayed partition doesn't show anywhere (new comments, reopened threads, undone
	// deletions) render as plain pins until the next zoom-out folds them in. Judged against the
	// displayed partition, so a detached-then-restored leaf reappears.
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
	// Subscribe to the runtime's partition version, not the raw zoom, so this only re-renders on cluster
	// changes rather than every camera frame. The memo below re-reads the version inline because
	// render-time detaches bump it after the subscription's computed already evaluated.
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

	return {
		model: clusterModel,
		zoomBounds: clusterZoomBounds,
		fadeNodes,
		orphanThreads,
		heldThreads,
	}
}

/**
 * Whether a position-only input change (ids equal, same order) moved a leaf folded inside a badge
 * of the rendered partition — the one move the mid-drag freeze must let through.
 *
 * Folded means a member of a displayed badge, not merely "absent from the displayed partition":
 * the input also carries orphans (threads the rendered partition has never seen) and detached
 * leaves, which already ride their anchors as plain pins. Neither is in the rendered table, so the
 * pop-out below can never hold one — counting them here would break the freeze on every
 * pointermove for the rest of the drag.
 * @internal
 */
export function anyFoldedLeafMoved(
	prev: ClusterInput,
	next: ClusterInput,
	rendered: ClusterModel | null
): boolean {
	if (!rendered) return false
	if (prev.leaves.length !== next.leaves.length) return false
	const folded = new Set<string>()
	for (const node of rendered.runtime.getVisible().values()) {
		if (node.count < 2) continue
		for (const member of node.members) folded.add(member)
	}
	// No badges on screen, so nothing can be folded — the common case, and the cheap way out of it.
	if (folded.size === 0) return false
	for (let i = 0; i < next.leaves.length; i++) {
		if (!folded.has(next.leaves[i].id)) continue
		const a = prev.leaves[i].point
		const b = next.leaves[i].point
		if (Math.abs(a.x - b.x) > MOVED_LEAF_EPSILON || Math.abs(a.y - b.y) > MOVED_LEAF_EPSILON) {
			return true
		}
	}
	return false
}

/**
 * Leaves folded inside a badge whose live anchor no longer matches the position the rendered
 * model was built with. Visible (unclustered) leaf pins track their anchor live, so they can
 * stay deferred; a badge can't follow a member, so these must pop out of clustering.
 */
function findMovedClusteredLeafIds(rendered: ClusterModel, latest: { table: ClusterTable }) {
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

function getClusterZoomBounds(editor: Editor): ClusterZoomBounds {
	const cameraOptions = editor.getCameraOptions()
	const baseZoom = cameraOptions.constraints ? editor.getBaseZoom() : 1
	const zoomSteps = cameraOptions.zoomSteps
	return {
		minZoom: zoomSteps[0] * baseZoom,
		maxZoom: zoomSteps[zoomSteps.length - 1] * baseZoom,
	}
}

/**
 * Bring a thread's pin into view: switch pages if needed, then zoom to the first cluster split
 * that unfolds it from its badge (or just centre on it when it isn't clustered).
 */
export function revealThreadPin(
	editor: Editor,
	thread: TLCommentThread,
	table: ClusterTable,
	zoomBounds: ClusterZoomBounds,
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

	const offset = commentCenterScreenOffset(editor) / editor.getZoomLevel()
	editor.centerOnPoint({ x: point.x + offset, y: point.y }, { animation: { duration } })
}

/**
 * Zoom to just past the zoom at which a cluster first unclusters, centered on its centroid. The
 * event that created a visible cluster is the event that splits it, and has the smallest zSplit of
 * everything applied inside it — so its zSplit is exactly the first split within those comments.
 * The animated zoom drives the runtime cursor like any manual zoom. A no-op with no split event.
 */
export function zoomToClusterSplit(
	editor: Editor,
	table: ClusterTable,
	zoomBounds: ClusterZoomBounds,
	node: ClusterNode
) {
	const event = table.events.find((e) => e.result.id === node.id)
	if (!event || !Number.isFinite(event.zSplit)) return
	const zoom = clamp(
		event.zSplit * CLUSTER_SPLIT_ZOOM_FACTOR,
		zoomBounds.minZoom,
		zoomBounds.maxZoom
	)
	centerOnPointAtZoom(editor, node.centroid, zoom, CLUSTER_EXPAND_ZOOM_MS)
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
	// The open sidebar shifts the target left so the pin lands mid-uncovered-area, not under it.
	const offset = commentCenterScreenOffset(editor)
	editor.setCamera(
		{
			x: (viewport.w / 2 - offset) / zoom - point.x,
			y: viewport.h / (2 * zoom) - point.y,
			z: zoom,
		},
		{ animation: { duration } }
	)
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}
