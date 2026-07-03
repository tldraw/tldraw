/* eslint-disable tldraw/jsx-no-literals */
import { Editor, TLShapeId, useEditor, useValue } from '@tldraw/editor'
import { useMemo, useState } from 'react'
import { useCommentStore, useComments } from './CommentStoreContext'
import { TLComment } from './TLCommentStore'

/**
 * The default on-canvas comment UI, mounted in the editor's `InFrontOfTheCanvas` slot when
 * `<Tldraw>` is given a `comments` store. It renders a pin per comment (positioned on the shape the
 * comment is anchored to) and a composer for the single selected shape. Reads and writes go through
 * the provided {@link TLCommentStore}; nothing here touches the editor's store.
 *
 * @public
 * @react
 */
export function CommentCanvasLayer() {
	const editor = useEditor()
	const store = useCommentStore()
	const comments = useComments()

	const selectedShapeId = useValue(
		'single selected shape',
		() => {
			const ids = editor.getSelectedShapeIds()
			return ids.length === 1 ? ids[0] : null
		},
		[editor]
	)

	// When arriving from a cross-document deep link (?comment=<id>), open that comment's popover.
	const focusedCommentId = useMemo(
		() => new URLSearchParams(window.location.search).get('comment'),
		[]
	)

	if (!store) return null

	return (
		<>
			{comments.map((comment) => (
				<CommentPin
					key={comment.id}
					editor={editor}
					comment={comment}
					defaultOpen={comment.id === focusedCommentId}
					onDelete={() => store.delete(comment.id)}
				/>
			))}
			{selectedShapeId && (
				<CommentComposer
					editor={editor}
					shapeId={selectedShapeId}
					onSubmit={(text) =>
						store.create({ anchor: { type: 'shape', shapeId: selectedShapeId }, text })
					}
				/>
			)}
		</>
	)
}

function CommentPin({
	editor,
	comment,
	defaultOpen,
	onDelete,
}: {
	editor: Editor
	comment: TLComment
	defaultOpen: boolean
	onDelete(): void
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
					<div
						style={{
							marginTop: 6,
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							opacity: 0.6,
							fontSize: 11,
						}}
					>
						<span>{comment.author?.name ?? comment.authorId}</span>
						<button
							onClick={onDelete}
							style={{
								border: 'none',
								background: 'none',
								color: 'inherit',
								cursor: 'pointer',
								padding: 0,
							}}
						>
							Delete
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

function CommentComposer({
	editor,
	shapeId,
	onSubmit,
}: {
	editor: Editor
	shapeId: TLShapeId
	onSubmit(text: string): void
}) {
	const [text, setText] = useState('')

	// Anchor the composer just below the selected shape (in viewport coords, so it tracks the camera)
	// to avoid colliding with the bottom-center toolbar, which renders above this in-front layer.
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
		onSubmit(trimmed)
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
