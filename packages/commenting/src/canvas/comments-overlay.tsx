import { isMentionPickerOpen } from '@tldraw/mentions'
import {
	Fragment,
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
	TLCommentThread,
	useContainer,
	useEditor,
	usePassThroughMouseOverEvents,
	useValue,
} from 'tldraw'
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
 * A ready-to-use comments layer for a tldraw canvas: pins each thread at its anchor, opens a
 * thread popover (with a reply composer) on click, and shows a composer where the comment tool
 * placed a new thread. Reads/writes comment records straight from `editor.store`.
 *
 * It's meant as the batteries-included default — every visible piece is a lever (the `CommentBody`
 * and `PinContent` slots on `CommentTool.configure({ components })`), and the pieces it composes
 * (`CommentPin`, `CommentThread`, `CommentComposer`, the hooks, the tool) are all exported, so a
 * consumer can rebuild this from parts instead.
 *
 * The host wiring — who the viewer is, how ids become names, read status, mentions — is the
 * {@link CommentingContext}, which `CanvasCommentsSidebar` takes too, so a host mounting both can
 * build it once and spread it into each.
 *
 * @public @react
 */
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

function CanvasCommentsLayer(props: CommentingContext) {
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
	const allThreads = useCommentThreads(editor)
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
	// Hide resolved threads' pins by default, matching the sidebar's `showResolved` filter. The open
	// thread stays in — resolving from its own popover shouldn't make the pin vanish under it.
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
	// Zooming separates near pins, but pins with the *same* anchor point (several imprecise
	// comments on one shape) coincide at every zoom — those render as one count-badge stack that
	// opens the threads as a list. Keyed on page-space anchors, so camera moves never recompute this.
	// Value-equality gated like the cluster leaves (see useClusterModel): recomputes triggered by
	// comment mutations or shape drags that leave the coincident groups unchanged return the
	// previous Map identity, so nothing downstream re-renders. Membership only — the map carries no
	// positions, so anything that needs the stack's *point* must read it reactively rather than
	// keying off this identity (see the stale-key check below).
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
	//
	// Reactive rather than an effect keyed on `pinStacks`: the key is a *position*, but `pinStacks`
	// is membership-only and deliberately holds its identity while a coincident group moves together
	// (the whole group shares one anchor shape, so any move of that shape is exactly this case).
	// `ThreadStackPin` recomputes its own position-derived `stackId` live and closes the list, and
	// its Escape/click-away handlers unregister with it — so a move with no local pointerdown
	// outside the popover (a collaborator, undo, a nudge, align from a menu) would otherwise strand
	// the key forever. Reading the anchors here subscribes to them; the early-out keeps that
	// subscription empty whenever no stack is open.
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

	// Clicking a badge zooms past the zoom at which that cluster first unclusters, centered on its
	// centroid — see `zoomToClusterSplit`.
	const expandCluster = useCallback(
		(node: ClusterNode) => {
			zoomToClusterSplit(editor, clusterModel.table, clusterZoomBounds, node)
		},
		[clusterModel.table, clusterZoomBounds, editor]
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
