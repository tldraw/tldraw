/* eslint-disable tldraw/jsx-no-literals */
import { useMemo, useState } from 'react'
import { Editor, TLComment, TLShapeId, createComment, useEditor, useValue } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'

/**
 * Minimal v1 comments UI, mounted as `InFrontOfTheCanvas`. Reads comment records straight from the
 * tldraw file store (they sync through the room), renders a pin per comment on its shape, and lets
 * you add a plaintext comment to the single selected shape. Cross-document comments live at the
 * /comments route (backed by Zero), not here.
 */
export function CommentsOnCanvas() {
	const editor = useEditor()
	const app = useMaybeApp()
	const authorId = app?.userId ?? 'anonymous'

	const comments = useValue(
		'comments',
		() => editor.store.query.records('comment' as any).get() as unknown as TLComment[],
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

	// When arriving from a /comments deep link (?comment=<id>), open that comment's popover.
	const focusedCommentId = useMemo(
		() => new URLSearchParams(window.location.search).get('comment'),
		[]
	)

	return (
		<>
			{comments.map((comment) => (
				<CommentPin
					key={comment.id}
					editor={editor}
					comment={comment}
					defaultOpen={comment.id === focusedCommentId}
				/>
			))}
			{selectedShapeId && (
				<CommentComposer editor={editor} shapeId={selectedShapeId} authorId={authorId} />
			)}
		</>
	)
}

function CommentPin({
	editor,
	comment,
	defaultOpen = false,
}: {
	editor: Editor
	comment: TLComment
	defaultOpen?: boolean
}) {
	const [open, setOpen] = useState(defaultOpen)

	const point = useValue(
		'pin point',
		() => {
			if (comment.anchor.type !== 'shape') return null
			const bounds = editor.getShapePageBounds(comment.anchor.shapeId as TLShapeId)
			if (!bounds) return null
			// top-right corner of the shape, in container-relative (viewport) coordinates
			return editor.pageToViewport({ x: bounds.maxX, y: bounds.minY })
		},
		[editor, comment.anchor]
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
			<button
				onPointerDown={(e) => e.stopPropagation()}
				onClick={() => setOpen((o) => !o)}
				title={comment.text}
				style={{
					transform: 'translate(-4px, -50%)',
					width: 24,
					height: 24,
					borderRadius: '50% 50% 50% 2px',
					border: '2px solid white',
					background: '#4285f4',
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
					<div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{comment.text}</div>
					<div style={{ marginTop: 4, opacity: 0.6, fontSize: 11 }}>{comment.authorId}</div>
				</div>
			)}
		</div>
	)
}

function CommentComposer({
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
				// comment isn't part of the default TLRecord union; it's an opt-in registered record
				editor.store.put([
					createComment({ anchor: { type: 'shape', shapeId }, authorId, text: trimmed }) as any,
				])
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
