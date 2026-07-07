/* eslint-disable tldraw/jsx-no-literals */
import { CommentCard, CommentCardProps, CommentComposer, CommentPin } from '@tldraw/commenting'
import { useMemo, useState } from 'react'
import {
	Editor,
	TLComment,
	TLCommentAnchor,
	TLCommentThread,
	TLShapeId,
	createComment,
	createCommentThread,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { richTextToPlaintext } from '../../utils/richText'

/**
 * Comments UI, mounted as `InFrontOfTheCanvas`. Reads comment-thread and comment records straight
 * from the tldraw file store (they sync through the room's object lane), pins a thread at its
 * anchor, and lets an authenticated user start a shape-anchored thread on the single selected
 * shape. The pin, thread cards, and composer are the shared `@tldraw/commenting` components; a
 * small adapter maps each synced `TLComment` onto the card's presentational props. Cross-document
 * comments live at the /comments route (backed by Zero), not here.
 */
export function CommentsOnCanvas() {
	const editor = useEditor()
	const app = useMaybeApp()
	// Anonymous sessions get objectAccess 'read' server-side, so only authenticated users can
	// compose; guests still see existing threads.
	const authorId = app?.userId ?? null

	const threads = useValue(
		'comment threads',
		() => editor.store.query.records('comment-thread' as any).get() as unknown as TLCommentThread[],
		[editor]
	)

	const selectedShapeId = useValue(
		'single selected shape',
		() => {
			const ids = editor.getSelectedShapeIds()
			return ids.length === 1 ? ids[0] : null
		},
		[editor]
	)

	// When arriving from a /comments deep link (?comment=<id>), open that thread's popover. The
	// link may carry a thread id or one of its comment ids.
	const focusedId = useMemo(() => new URLSearchParams(window.location.search).get('comment'), [])

	return (
		<>
			{threads.map((thread) => (
				<ThreadPin
					key={thread.id}
					editor={editor}
					thread={thread}
					focusedId={focusedId}
					currentUserId={authorId}
				/>
			))}
			{selectedShapeId && authorId && (
				<ThreadComposer editor={editor} shapeId={selectedShapeId} authorId={authorId} />
			)}
		</>
	)
}

/**
 * Adapt a synced `TLComment` record to `CommentCard` props — the same "components consume the
 * model" boundary the studio uses. Author names aren't resolved on the canvas yet (the /comments
 * view joins them via Zero); the raw id stands in until that resolver is threaded through.
 */
function commentToCardProps(comment: TLComment, currentUserId: string | null): CommentCardProps {
	return {
		author: comment.authorId,
		body: richTextToPlaintext(comment.body),
		date: new Date(comment.createdAt).toISOString(),
		you: comment.authorId === currentUserId,
		edited: comment.editedAt != null,
	}
}

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
			// page-level threads have no spatial anchor; v1 doesn't pin them on the canvas
			return null
	}
}

function ThreadPin({
	editor,
	thread,
	focusedId,
	currentUserId,
}: {
	editor: Editor
	thread: TLCommentThread
	focusedId: string | null
	currentUserId: string | null
}) {
	const comments = useValue(
		'thread comments',
		() =>
			(editor.store.query.records('comment' as any).get() as unknown as TLComment[])
				.filter((c) => c.threadId === thread.id)
				.sort((a, b) => a.createdAt - b.createdAt),
		[editor, thread.id]
	)

	const defaultOpen =
		focusedId != null && (focusedId === thread.id || comments.some((c) => c.id === focusedId))
	const [open, setOpen] = useState(defaultOpen)

	const point = useValue(
		'pin point',
		() => {
			if (thread.pageId !== editor.getCurrentPageId()) return null
			const pagePoint = anchorPagePoint(editor, thread.anchor)
			if (!pagePoint) return null
			// container-relative (viewport) coordinates
			return editor.pageToViewport(pagePoint)
		},
		[editor, thread.anchor, thread.pageId]
	)

	if (!point) return null

	return (
		<div
			style={{
				position: 'absolute',
				left: point.x,
				top: point.y,
				pointerEvents: 'all',
				zIndex: 300,
			}}
		>
			<div
				onPointerDown={(e) => e.stopPropagation()}
				onClick={() => setOpen((o) => !o)}
				style={{ transform: 'translate(-50%, -50%)', width: 'max-content', cursor: 'pointer' }}
			>
				<CommentPin number={comments.length} resolved={thread.resolved != null} open={open} />
			</div>
			{open && (
				<div
					onPointerDown={(e) => e.stopPropagation()}
					style={{
						position: 'absolute',
						left: 20,
						top: 0,
						display: 'flex',
						flexDirection: 'column',
						gap: 8,
					}}
				>
					{comments.map((comment) => (
						<CommentCard key={comment.id} {...commentToCardProps(comment, currentUserId)} />
					))}
					{comments.length === 0 && (
						<CommentCard
							author=""
							body="No comments yet"
							date={new Date().toISOString()}
							you={false}
						/>
					)}
				</div>
			)}
		</div>
	)
}

function ThreadComposer({
	editor,
	shapeId,
	authorId,
}: {
	editor: Editor
	shapeId: TLShapeId
	authorId: string
}) {
	const [text, setText] = useState('')

	// Anchor the composer just below the selected shape (in viewport coords, tracks camera) so it
	// doesn't collide with the bottom-center toolbar, which renders above this in-front layer.
	const point = useValue(
		'composer point',
		() => {
			const bounds = editor.getShapePageBounds(shapeId)
			if (!bounds) return null
			return editor.pageToViewport({ x: bounds.minX, y: bounds.maxY })
		},
		[editor, shapeId]
	)

	const submit = () => {
		const trimmed = text.trim()
		if (!trimmed) return
		// Comment mutations are not undoable (see design notes): run with history: 'ignore'.
		editor.run(
			() => {
				const pageId = editor.getCurrentPageId()
				// a new thread anchored to the selected shape, with its first comment
				const thread = createCommentThread({
					pageId,
					anchor: { type: 'shape', shapeId },
					createdBy: authorId,
				})
				const comment = createComment({
					threadId: thread.id,
					pageId,
					authorId,
					body: toRichText(trimmed),
				})
				// comment records aren't part of the default TLRecord union; they're opt-in
				// registered records
				editor.store.put([thread as any, comment as any])
			},
			{ history: 'ignore' }
		)
		setText('')
	}

	if (!point) return null

	return (
		<div
			onPointerDown={(e) => e.stopPropagation()}
			style={{
				position: 'absolute',
				left: point.x,
				top: point.y + 8,
				pointerEvents: 'all',
				zIndex: 300,
			}}
		>
			<CommentComposer
				author={authorId}
				placeholder="Comment on the selected shape…"
				value={text}
				onChange={setText}
				onSubmit={submit}
				disabled={!text.trim()}
			/>
		</div>
	)
}
