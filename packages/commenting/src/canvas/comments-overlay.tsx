/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	atom,
	createComment,
	createCommentThread,
	Editor,
	TLComment,
	TLCommentAnchor,
	TLCommentThread,
	TldrawUiIcon,
	TLShapeId,
	toRichText,
	useContainer,
	useEditor,
	useValue,
} from 'tldraw'
import { CommentCard, CommentCardProps } from '../ui/comment-card'
import { CommentComposer } from '../ui/comment-composer'
import { CommentPin } from '../ui/comment-pin'
import { CommentThread } from '../ui/comment-thread'
import { CommentBody } from './comment-body'
import { pendingComment, PendingComment } from './comment-tool'
import { useCommentThreads, usePendingComment, useThreadComments } from './hooks'
import { richTextToPlaintext } from './rich-text'
import './canvas.css'

/** The id of the one open thread (only one popover is open at a time), or null when all closed. */
const openThreadId = atom<string | null>('openThreadId', null)

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
}

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

const initialOf = (name: string): string => (name.trim()[0] ?? '?').toUpperCase()

/** Where a thread's pin sits on the page, for each anchor kind. Null hides the pin. */
function anchorPagePoint(editor: Editor, anchor: TLCommentAnchor): { x: number; y: number } | null {
	switch (anchor.type) {
		case 'shape':
		case 'text-range': {
			const bounds = editor.getShapePageBounds(anchor.shapeId as TLShapeId)
			if (!bounds) return null
			return { x: bounds.maxX, y: bounds.minY }
		}
		case 'point':
			return { x: anchor.x, y: anchor.y }
		case 'region':
			return { x: anchor.x + anchor.w, y: anchor.y }
		case 'page':
			return null
	}
}

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
	const threads = useCommentThreads(editor)
	const pending = usePendingComment()

	// On mount, open the thread named by a deep link (?comment=<thread or comment id>). Reset the
	// transient UI state (open thread, half-placed comment) when this unmounts.
	useEffect(() => {
		const id = new URLSearchParams(window.location.search).get('comment')
		if (id) {
			const record = editor.store.get(id as any)
			if (record?.typeName === 'comment') openThreadId.set((record as TLComment).threadId)
			else if (record?.typeName === 'comment-thread') openThreadId.set(id)
		}
		return () => {
			openThreadId.set(null)
			pendingComment.set(null)
		}
	}, [editor])

	// Render into the container (above the panels' stacking context) so the pins and popovers
	// live in the UI layer rather than being clipped by the canvas layer.
	return createPortal(
		<div className="cmt-canvas-layer">
			{threads.map((thread) => (
				<ThreadPin key={thread.id} editor={editor} thread={thread} {...props} />
			))}
			{pending && props.currentUserId && (
				<PendingComposer editor={editor} pending={pending} {...props} />
			)}
		</div>,
		container
	)
}

function ThreadPin({
	editor,
	thread,
	...props
}: CanvasCommentsProps & { editor: Editor; thread: TLCommentThread }) {
	const { currentUserId, resolveName, renderPinContent, onPostComment } = props
	const comments = useThreadComments(editor, thread.id)
	// Only one thread's popover is open at a time — shared across pins via the atom.
	const open = useValue('thread open', () => openThreadId.get() === thread.id, [thread.id])
	const [reply, setReply] = useState('')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editText, setEditText] = useState('')

	const point = useValue(
		'pin point',
		() => {
			if (thread.pageId !== editor.getCurrentPageId()) return null
			const pagePoint = anchorPagePoint(editor, thread.anchor)
			return pagePoint ? editor.pageToViewport(pagePoint) : null
		},
		[editor, thread.anchor, thread.pageId]
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
					onKeyDown={(e) => {
						if (e.key === 'Escape') setEditingId(null)
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

	return (
		<div
			className={open ? 'cmt-canvas-pin cmt-canvas-pin--open' : 'cmt-canvas-pin'}
			style={{ left: point.x, top: point.y }}
		>
			<div
				className="cmt-canvas-pin__marker"
				onPointerDown={stop}
				onClick={() => openThreadId.set(openThreadId.get() === thread.id ? null : thread.id)}
			>
				<CommentPin resolved={thread.resolved != null} open={open}>
					{pinContent}
				</CommentPin>
			</div>
			{open && (
				<div className="cmt-canvas-pin__popover" onPointerDown={stop}>
					<CommentThread
						header="Thread"
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
				</div>
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

	return (
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
			/>
		</div>
	)
}
