import { isMentionPickerOpen } from '@tldraw/mentions'
import { Fragment, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { EditorPortal, TLCommentThread, useEditor, useValue } from 'tldraw'
import type { ClusterNode } from '../clustering/types'
import { registerCommentAnchorLifecycle } from './anchor-lifecycle'
import { ClusterBadge } from './cluster-badge'
import { clusterFadeClassName } from './cluster-fade'
import {
	CLUSTER_EXPAND_ZOOM_MS,
	revealThreadPin,
	useClusterModel,
	zoomToClusterSplit,
} from './cluster-model'
import {
	type CommentBaseCandidate,
	type CommentRenderUnit,
	resolveCommentRenderPlan,
} from './comment-render-plan'
import { getCommentRecord } from './comment-store'
import { type CommentingContext } from './context'
import { useCommentThreads } from './hooks'
import { useCommentingEnabled } from './license'
import { useCanComment, useCommentingOptions } from './options'
import { PendingComposer } from './pending-composer'
import { computePinStacks, isOpenStackKeyLive, pinStacksEqual } from './pin-stacking'
import { RegionBox, RegionDraftBox } from './region-box'
import {
	commentsHidden,
	openStackId,
	openThreadId,
	pendingComment,
	revealThreadRequest,
	sidebarFilters,
	toggleCommentsHidden,
	usePendingComment,
} from './state'
import { ThreadPin } from './thread-pin'
import { ThreadStackPin } from './thread-stack'

/**
 * The host wiring for {@link CanvasComments} — see {@link CommentingContext}, which the sidebar
 * takes the same fields from.
 *
 * @public
 */
export type CanvasCommentsProps = CommentingContext

/**
 * A ready-to-use comments layer for a tldraw canvas: pins each thread at its anchor, opens a
 * thread popover (with a reply composer) on click, and shows a composer where the comment tool
 * placed a new thread. Reads/writes comment records straight from `editor.store`.
 *
 * It's the batteries-included default: every visible piece is a slot on
 * `CommentTool.configure({ components })`, and the pieces it composes (`CommentPin`,
 * `CommentThread`, `CommentComposer`, the hooks, the tool) are all exported, so a consumer can
 * rebuild it from parts instead. The host wiring is the {@link CommentingContext}, which
 * `CanvasCommentsSidebar` takes too.
 *
 * @public @react
 */
export function CanvasComments(props: CanvasCommentsProps) {
	// The inner component holds every other hook, so mounting it as the license resolves keeps hook
	// order stable here.
	const commentingEnabled = useCommentingEnabled()
	if (!commentingEnabled) return null
	return <CanvasCommentsLayer {...props} />
}

function CanvasCommentsLayer(props: CommentingContext) {
	const editor = useEditor()
	const options = useCommentingOptions()
	const allThreads = useCommentThreads(editor)
	const pending = usePendingComment()
	const canComment = useCanComment(props.currentUserId)
	// Nothing renders a pending comment when composing is blocked and there's no fallback slot, and
	// the dismiss handlers live inside PendingComposer — so clear the atom rather than strand it,
	// and leave the tool too: it holds while a composer is open, so staying would turn every click
	// into a silently swallowed placement.
	const canRenderComposer = canComment || options.components.ComposerFallback != null
	const showPendingComposer = pending != null && canRenderComposer
	useEffect(() => {
		if (pending && !showPendingComposer) {
			pendingComment.set(editor, null)
			if (editor.isIn('comment')) editor.setCurrentTool('select')
		}
	}, [editor, pending, showPendingComposer])
	const openId = useValue('open thread id', () => openThreadId.get(editor), [editor])
	// Matches the sidebar's `showResolved` filter. The open thread stays in — resolving from its own
	// popover shouldn't make the pin vanish under it.
	const showResolved = useValue('show resolved', () => sidebarFilters.get(editor).showResolved, [
		editor,
	])
	const threads = useMemo(
		() => allThreads.filter((t) => showResolved || t.resolved == null || t.id === openId),
		[allThreads, showResolved, openId]
	)
	useEffect(() => registerCommentAnchorLifecycle(editor), [editor])
	const {
		model: clusterModel,
		zoomBounds: clusterZoomBounds,
		fadeNodes,
		orphanThreads,
		heldThreads,
	} = useClusterModel(editor, threads, openId)
	const threadsById = useMemo(
		() => new Map<string, TLCommentThread>(threads.map((thread) => [thread.id, thread])),
		[threads]
	)
	// Pins with the *same* anchor point coincide at every zoom, so they render as one count-badge
	// stack. Keyed on page-space anchors, so camera moves never recompute this. Holding the map's
	// identity while the grouping is unchanged keeps a reply from re-rendering every pin — but the
	// map has no positions in it, so anything needing a stack's *point* must read the anchors itself.
	const pinStacksRef = useRef<Map<string, readonly string[]>>(new Map())
	const pinStacks = useValue(
		'comment pin stacks',
		() => {
			const stacks = computePinStacks(editor, threads)
			if (pinStacksEqual(pinStacksRef.current, stacks)) return pinStacksRef.current
			pinStacksRef.current = stacks
			return stacks
		},
		[editor, threads]
	)
	const hidden = useValue('comments hidden', () => commentsHidden.get(editor), [editor])

	useEffect(() => {
		return () => {
			openThreadId.set(editor, null)
			openStackId.set(editor, null)
			pendingComment.set(editor, null)
			revealThreadRequest.set(editor, null)
		}
	}, [editor])

	// Clear a stale open-stack key: only the stack's own mounted handlers clear it, so collapsing to
	// a single pin strands it — and `useMarkerPreview` reads any non-null value as "a stack is open"
	// and suppresses every hover preview. Kept while any live stack still sits at that key. Reads the
	// anchors rather than keying off `pinStacks`, whose identity survives a stack moving as a whole.
	const openStackKeyIsStale = useValue(
		'open stack key stale',
		() => {
			const key = openStackId.get(editor)
			if (!key) return false
			return !isOpenStackKeyLive(editor, key, pinStacks, threadsById)
		},
		[editor, pinStacks, threadsById]
	)
	useEffect(() => {
		if (openStackKeyIsStale) openStackId.set(editor, null)
	}, [editor, openStackKeyIsStale])

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

	// Serve a pending reveal request, zooming to the first cluster split that reveals the pin if it's
	// folded into a badge. Also unhides pins: the popover opens on the layer that hiding withholds.
	useEffect(() => {
		if (!requestedRevealThread) return
		revealThreadRequest.set(editor, null)
		commentsHidden.set(editor, false)
		revealThreadPin(editor, requestedRevealThread, clusterModel.table, clusterZoomBounds, options)
		openThreadId.set(editor, requestedRevealThread.id)
	}, [requestedRevealThread, clusterModel.table, clusterZoomBounds, editor, options])

	// Picking a thread out of a cluster's hover preview. `openThreadId` alone would work, but would
	// cut straight there from the badge — zoom in first, the same move the badge's own click makes.
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

	const expandCluster = useCallback(
		(node: ClusterNode) => {
			zoomToClusterSplit(editor, clusterModel.table, clusterZoomBounds, node)
		},
		[clusterModel.table, clusterZoomBounds, editor]
	)

	// Escape collapses the open thread. Capture-phase so it runs ahead of the editor, which would
	// otherwise cancel the tool or clear the selection.
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

	// Shift+C toggles pin visibility. Physical `KeyC` so it's layout-independent, and skipped while
	// typing so it never fires from inside a composer.
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

	// The signal is read above so this stays mounted and its shortcut/Escape effects keep running.
	if (hidden) return null

	// The base layer under the open/held/orphan slots: fading cluster nodes when clustering is on,
	// the plain thread list when it's off.
	const base: CommentBaseCandidate[] = options.enableClustering
		? fadeNodes.map(({ node, phase }) => ({ kind: 'node', node, phase }))
		: threads.map((thread) => ({ kind: 'thread', threadId: thread.id }))

	// One flat, deduplicated draw list. Each thread/stack/badge is claimed by exactly one slot in
	// priority order (open > held > orphan > base), so a thread that's a live candidate in several
	// slots at once — as when it opens and its old cluster node lingers for the exit fade — is drawn
	// once, by the highest-priority slot. No per-slot guard needed: duplicates can't occur.
	const plan = resolveCommentRenderPlan({
		openThreadId: openId,
		heldThreadIds: options.enableClustering ? heldThreads.map((t) => t.id) : [],
		orphanThreadIds: options.enableClustering ? orphanThreads.map((t) => t.id) : [],
		base,
		pinStacks,
	})

	const renderUnit = (unit: CommentRenderUnit): ReactNode => {
		switch (unit.kind) {
			case 'pin': {
				const thread = threadsById.get(unit.threadId)
				return thread ? <ThreadPin editor={editor} thread={thread} {...props} /> : null
			}
			case 'stack': {
				const stackThreads = unit.group
					.map((id) => threadsById.get(id))
					.filter((t): t is TLCommentThread => t !== undefined)
				return stackThreads.length ? (
					<ThreadStackPin editor={editor} threads={stackThreads} {...props} />
				) : null
			}
			case 'badge':
				return (
					<ClusterBadge
						editor={editor}
						node={unit.node}
						onExpand={expandCluster}
						onSelectThread={revealClusteredThread}
						threadsById={threadsById}
						currentUserId={props.currentUserId}
						resolveAuthor={props.resolveAuthor}
					/>
				)
		}
	}

	// Portalled rather than rendered into this component's slot: pins sit below the collaborator
	// cursors and popovers above the UI panels, and no single canvas layer spans both. The portal
	// also fixes where the layer lands among the container's children, keeping it behind the UI's
	// skip link in the tab order.
	return (
		<EditorPortal>
			{/* Wheel pass-through lives on each interactive element, not this root: the root spans the
			    whole canvas, so a pin past its bottom/right edge inflates scrollHeight and the wheel
			    hook's is-this-scrollable guard silently disables pass-through. */}
			<div className="tlui-cmt-canvas-layer">
				{plan.map((entry) =>
					entry.phase === null ? (
						<Fragment key={entry.key}>{renderUnit(entry.unit)}</Fragment>
					) : (
						<div key={entry.key} className={clusterFadeClassName(entry.phase)}>
							{renderUnit(entry.unit)}
						</div>
					)
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
			</div>
		</EditorPortal>
	)
}
