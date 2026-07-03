/* eslint-disable tldraw/jsx-no-literals */
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
 * Minimal v1 comments UI, mounted as `InFrontOfTheCanvas`. Reads comment-thread and comment
 * records straight from the tldraw file store (they sync through the room's object lane), renders
 * a pin per thread at its anchor, and lets you start a shape-anchored thread on the single
 * selected shape. Cross-document comments live at the /comments route (backed by Zero), not here.
 */
export function CommentsOnCanvas() {
	const editor = useEditor()
	const app = useMaybeApp()
	const authorId = app?.userId ?? 'anonymous'

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
				<ThreadPin key={thread.id} editor={editor} thread={thread} focusedId={focusedId} />
			))}
			{selectedShapeId && (
				<ThreadComposer editor={editor} shapeId={selectedShapeId} authorId={authorId} />
			)}
		</>
	)
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
}: {
	editor: Editor
	thread: TLCommentThread
	focusedId: string | null
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
				opacity: thread.resolvedAt != null ? 0.5 : 1,
			}}
		>
			<button
				onPointerDown={(e) => e.stopPropagation()}
				onClick={() => setOpen((o) => !o)}
				title={comments[0] ? richTextToPlaintext(comments[0].body) : ''}
				style={{
					transform: 'translate(-4px, -50%)',
					width: 24,
					height: 24,
					borderRadius: '50% 50% 50% 2px',
					border: '2px solid white',
					background: thread.resolvedAt != null ? '#9aa0a6' : '#4285f4',
					color: 'white',
					cursor: 'pointer',
					boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
					fontSize: 12,
				}}
			>
				💬
			</button>
			{open && (
				<div
					onPointerDown={(e) => e.stopPropagation()}
					style={{
						position: 'absolute',
						left: 24,
						top: -8,
						minWidth: 180,
						maxWidth: 260,
						padding: 8,
						borderRadius: 8,
						background: 'white',
						color: '#111',
						boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
						fontSize: 13,
					}}
				>
					{comments.map((comment) => (
						<div key={comment.id} style={{ marginBottom: 6 }}>
							<div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
								{richTextToPlaintext(comment.body)}
							</div>
							<div style={{ marginTop: 2, opacity: 0.6, fontSize: 11 }}>{comment.authorId}</div>
						</div>
					))}
					{comments.length === 0 && <div style={{ opacity: 0.6 }}>No comments</div>}
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
				display: 'flex',
				gap: 6,
				padding: 6,
				borderRadius: 10,
				background: 'white',
				boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
				zIndex: 300,
			}}
		>
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') submit()
				}}
				placeholder="Comment on the selected shape…"
				style={{ width: 240, border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px' }}
			/>
			<button
				onClick={submit}
				style={{
					border: 'none',
					borderRadius: 6,
					padding: '6px 12px',
					background: '#4285f4',
					color: 'white',
					cursor: 'pointer',
				}}
			>
				Comment
			</button>
		</div>
	)
}
