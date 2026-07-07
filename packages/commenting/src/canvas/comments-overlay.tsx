/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	createComment,
	createCommentThread,
	Editor,
	TLComment,
	TLCommentAnchor,
	TLCommentThread,
	TLShapeId,
	toRichText,
	useContainer,
	useEditor,
	useValue,
} from 'tldraw'
import { CommentCardProps } from '../ui/comment-card'
import { CommentComposer } from '../ui/comment-composer'
import { CommentPin } from '../ui/comment-pin'
import { CommentThread } from '../ui/comment-thread'
import { CommentBody } from './comment-body'
import { pendingComment, PendingComment } from './comment-tool'
import { useCommentThreads, usePendingComment, useThreadComments } from './hooks'
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

	// When arriving from a deep link (?comment=<id>), open that thread's popover.
	const focusedId = useMemo(() => new URLSearchParams(window.location.search).get('comment'), [])

	// Never leave a half-placed comment behind when this unmounts.
	useEffect(() => {
		return () => {
			pendingComment.set(null)
		}
	}, [])

	// Render into the container (above the panels' stacking context) so the pins and popovers
	// live in the UI layer rather than being clipped by the canvas layer.
	return createPortal(
		<div className="cmt-canvas-layer">
			{threads.map((thread) => (
				<ThreadPin
					key={thread.id}
					editor={editor}
					thread={thread}
					focusedId={focusedId}
					{...props}
				/>
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
	focusedId,
	...props
}: CanvasCommentsProps & { editor: Editor; thread: TLCommentThread; focusedId: string | null }) {
	const { currentUserId, resolveName, renderPinContent, onPostComment } = props
	const comments = useThreadComments(editor, thread.id)
	const [open, setOpen] = useState(
		focusedId != null && (focusedId === thread.id || comments.some((c) => c.id === focusedId))
	)
	const [reply, setReply] = useState('')

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

	const pinContent = renderPinContent
		? renderPinContent(thread, comments)
		: initialOf(resolveName(thread.createdBy))

	return (
		<div className="cmt-canvas-pin" style={{ left: point.x, top: point.y }}>
			<div
				className="cmt-canvas-pin__marker"
				onPointerDown={stop}
				onClick={() => setOpen((o) => !o)}
			>
				<CommentPin resolved={thread.resolved != null} open={open}>
					{pinContent}
				</CommentPin>
			</div>
			{open && (
				<div className="cmt-canvas-pin__popover" onPointerDown={stop}>
					<CommentThread
						header="Thread"
						comments={comments.map((c) => toCardProps(c, props))}
						resolvedBy={thread.resolved ? resolveName(thread.resolved.by) : undefined}
						composer={
							currentUserId
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
