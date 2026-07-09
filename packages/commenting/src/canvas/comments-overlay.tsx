/* eslint-disable tldraw/jsx-no-literals */
import {
	type PointerEvent as ReactPointerEvent,
	ReactNode,
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
	TLComment,
	TLCommentThread,
	TldrawUiIcon,
	toRichText,
	useContainer,
	useEditor,
	useValue,
} from 'tldraw'
import { computeClusterTable } from '../clustering/computeClusterTable'
import { createClusterRuntime } from '../clustering/runtime'
import type { ClusterNode, ClusterTable, MergeEvent } from '../clustering/types'
import { CommentCard, CommentCardProps } from '../ui/comment-card'
import { CommentComposer } from '../ui/comment-composer'
import { CommentPin } from '../ui/comment-pin'
import { CommentThread } from '../ui/comment-thread'
import { CountBadge } from '../ui/count-badge'
import { collectClusterLeaves } from './cluster-input'
import { CommentBody } from './comment-body'
import { pendingComment, PendingComment } from './comment-tool'
import { useCommentThreads, usePendingComment, useThreadComments } from './hooks'
import { useCommentingEnabled } from './license'
import { richTextToPlaintext } from './rich-text'
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
	const deepLinkHandled = useRef(false)
	const threads = useCommentThreads(editor)
	const pending = usePendingComment()
	const openId = useValue('open thread id', () => openThreadId.get(), [])
	const { impreciseShapeAnchor } = props
	const clusterLeaves = useValue(
		'comment cluster leaves',
		() => collectClusterLeaves(editor, threads, openThreadId.get(), impreciseShapeAnchor),
		[editor, threads, impreciseShapeAnchor]
	)
	const clusterZoomBounds = useValue(
		'comment cluster zoom bounds',
		() => getClusterZoomBounds(editor),
		[editor]
	)
	const clusterModel = useMemo(() => {
		const table = computeClusterTable(clusterLeaves, clusterZoomBounds)
		const runtime = createClusterRuntime(table)
		runtime.seed(editor.getZoomLevel())
		return { runtime, table }
	}, [clusterLeaves, clusterZoomBounds, editor])
	const zoom = useValue('comment cluster zoom', () => editor.getZoomLevel(), [editor])
	const visibleNodes = useMemo(() => {
		clusterModel.runtime.onCamera(zoom)
		return Array.from(clusterModel.runtime.getVisible().values())
	}, [clusterModel, zoom])
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
		<div className="cmt-canvas-layer">
			{visibleNodes.map((node) => {
				if (node.count === 1) {
					const thread = threadsById.get(node.id)
					if (!thread) return null
					return <ThreadPin key={thread.id} editor={editor} thread={thread} {...props} />
				}
				return <ClusterBadge key={node.id} editor={editor} node={node} />
			})}
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

function centerOnPointAtZoom(editor: Editor, point: { x: number; y: number }, zoom: number) {
	const viewport = editor.getViewportScreenBounds()
	editor.setCamera(
		{
			x: viewport.w / (2 * zoom) - point.x,
			y: viewport.h / (2 * zoom) - point.y,
			z: zoom,
		},
		{ animation: { duration: 200 } }
	)
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

function ClusterBadge({ editor, node }: { editor: Editor; node: ClusterNode }) {
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
		<div className="cmt-canvas-cluster" style={{ left: point.x, top: point.y }}>
			<CountBadge count={node.count} />
		</div>
	)
}

function isInInflatedViewport(editor: Editor, point: { x: number; y: number }): boolean {
	const viewport = editor.getViewportScreenBounds()
	return (
		point.x >= -CLUSTER_DMAX &&
		point.y >= -CLUSTER_DMAX &&
		point.x <= viewport.w + CLUSTER_DMAX &&
		point.y <= viewport.h + CLUSTER_DMAX
	)
}

function ThreadPin({
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
	const [reply, setReply] = useState('')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editText, setEditText] = useState('')
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
		const trimmed = reply.trim()
		if (!trimmed || !currentUserId) return
		editor.run(
			() => {
				const comment = createComment({
					threadId: thread.id,
					pageId: thread.pageId,
					authorId: currentUserId,
					body: toRichText(trimmed),
				})
				editor.store.put([comment as any])
				if (onPostComment) onPostComment(comment)
			},
			{ history: 'ignore' }
		)
		setReply('')
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
		setEditText(richTextToPlaintext(comment.body))
	}

	const saveEdit = () => {
		const comment = comments.find((c) => c.id === editingId)
		const trimmed = editText.trim()
		if (!comment || !trimmed) return
		editor.run(
			() => {
				editor.store.put([{ ...comment, body: toRichText(trimmed), editedAt: Date.now() } as any])
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
						disabled={!editText.trim()}
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
			{open &&
				createPortal(
					<div
						className="cmt-canvas-popover"
						style={{ left: renderPoint.x + 36, top: renderPoint.y - 28 }}
						onPointerDown={stop}
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
											disabled: !reply.trim(),
										}
									: undefined
							}
						/>
					</div>,
					container
				)}
		</div>
	)
}

function PendingComposer({
	editor,
	pending,
	currentUserId,
	resolveName,
	onPostComment,
}: CanvasCommentsProps & { editor: Editor; pending: PendingComment }) {
	const [text, setText] = useState('')
	const ref = useRef<HTMLDivElement>(null)
	const container = useContainer()

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
		const trimmed = text.trim()
		if (!trimmed || !currentUserId) return
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
					body: toRichText(trimmed),
				})
				editor.store.put([thread as any, comment as any])
				if (onPostComment) onPostComment(comment)
			},
			{ history: 'ignore' }
		)
		setText('')
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
				disabled={!text.trim()}
				autoFocus
				leading={draftAvatar}
			/>
		</div>,
		container
	)
}
