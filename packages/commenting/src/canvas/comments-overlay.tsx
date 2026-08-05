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
 * Which thread's pin a fade node should draw: its own thread for a single pin, `stackOwner` (when
 * still a member) for a coincident stack, null for neither. Never the open thread — the open-thread
 * render slot draws that one, and drawing it here too (which the fade-out window would otherwise
 * do) mounts its popover twice.
 * @internal
 */
export function fadeNodeMarkerThreadId(
	node: ClusterNode,
	stackOwner: string | null,
	openId: string | null
): string | null {
	const candidate =
		node.count === 1 ? node.id : stackOwner && node.members.includes(stackOwner) ? stackOwner : null
	return candidate === openId ? null : candidate
}

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
	const openThread = openId ? threadsById.get(openId) : null
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

	// The node's pin-stack group when every member shares one — a stack standing on its own, which
	// renders as a cascading count-badge list rather than a zoom-to-split cluster badge. The group
	// can include an open or orphan member the node's own leaves omit.
	const stackGroupOf = (node: ClusterNode): readonly string[] | null => {
		const group = pinStacks.get(node.members[0])
		if (!group) return null
		return node.members.every((id) => group.includes(id)) ? group : null
	}

	// Which threads are on screen this render. A stack renders once, owned by its first on-screen
	// member — members arrive by different paths, so ownership can't be decided per-path.
	const renderedThreadIds = new Set<string>()
	if (options.enableClustering) {
		for (const { node } of fadeNodes) {
			if (node.count === 1) renderedThreadIds.add(node.id)
			// A pure-stack node's members aren't count-1 leaves, so register them here for the owner
			// logic to pick from.
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
				{options.enableClustering ? (
					<>
						{fadeNodes.map(({ node, phase }) => {
							let content: ReactNode
							const stackGroup = node.count > 1 ? stackGroupOf(node) : null
							if (node.count === 1) {
								const markerId = fadeNodeMarkerThreadId(node, null, openId)
								const thread = markerId ? threadsById.get(markerId) : undefined
								if (!thread) return null
								content = renderThreadPin(thread)
							} else if (stackGroup) {
								// Routed through the stack's owner so the open/orphan/held slots stay deduped:
								// when the owner is one of them, that slot draws the stack and this draws nothing.
								const owner = stackGroup.find((id) => renderedThreadIds.has(id)) ?? null
								const markerId = fadeNodeMarkerThreadId(node, owner, openId)
								content = markerId ? renderThreadPin(threadsById.get(markerId)!) : null
							} else {
								content = (
									<ClusterBadge
										editor={editor}
										node={node}
										onExpand={expandCluster}
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
					// Clustering off: every thread renders its own pin. The open thread is excluded and
					// rendered once below, or it would mount a second, stacked pin.
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
			</div>
		</EditorPortal>
	)
}
