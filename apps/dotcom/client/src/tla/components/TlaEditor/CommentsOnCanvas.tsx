/* eslint-disable tldraw/jsx-no-literals */
import { CommentCard, CommentCardProps, CommentComposer, CommentPin } from '@tldraw/commenting'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { PendingComment, pendingComment } from './CommentTool'

/**
 * Comments UI, mounted as `InFrontOfTheCanvas`. Reads comment-thread and comment records straight
 * from the tldraw file store (they sync through the room's object lane) and pins each thread at its
 * anchor. New threads are started with the comment tool, which drops a `pendingComment`; this
 * renders the composer there and creates the records on post. The pin, thread cards, and composer
 * are the shared `@tldraw/commenting` components, fed by a small adapter that maps each synced
 * `TLComment` onto the card's presentational props. Cross-document comments live at the /comments
 * route (backed by Zero), not here.
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

	const pending = useValue('pending comment', () => pendingComment.get(), [])

	// When arriving from a /comments deep link (?comment=<id>), open that thread's popover. The
	// link may carry a thread id or one of its comment ids.
	const focusedId = useMemo(() => new URLSearchParams(window.location.search).get('comment'), [])

	// Never leave a half-placed comment behind when the editor unmounts (e.g. a file switch).
	useEffect(() => {
		return () => {
			pendingComment.set(null)
		}
	}, [])

	// Resolve an author id to a display name: the current user from their preferences, other
	// authors from live presence (each `user:<id>` presence record carries a userName). Falls
	// back to "Someone" for an author who isn't the current user and isn't currently present.
	const currentUserName = useValue(
		'current user name',
		() => {
			if (!app) return 'You'
			return app.tlUser.userPreferences.get().name || 'You'
		},
		[app]
	)
	const presenceNames = useValue(
		'presence names',
		() => {
			const names = new Map<string, string>()
			for (const p of editor.store.query.records('instance_presence').get()) {
				if (p.userName) names.set(p.userId.replace(/^user:/, ''), p.userName)
			}
			return names
		},
		[editor]
	)
	const resolveName = useCallback(
		(id: string) => (id === authorId ? currentUserName : (presenceNames.get(id) ?? 'Someone')),
		[authorId, currentUserName, presenceNames]
	)

	return (
		<>
			{threads.map((thread) => (
				<ThreadPin
					key={thread.id}
					editor={editor}
					thread={thread}
					focusedId={focusedId}
					currentUserId={authorId}
					resolveName={resolveName}
				/>
			))}
			{pending && authorId && (
				<ThreadComposer editor={editor} pending={pending} authorId={authorId} />
			)}
		</>
	)
}

/**
 * Adapt a synced `TLComment` record to `CommentCard` props — the same "components consume the
 * model" boundary the studio uses. `resolveName` turns the record's author id into a display name.
 */
function commentToCardProps(
	comment: TLComment,
	resolveName: (id: string) => string,
	currentUserId: string | null
): CommentCardProps {
	return {
		author: resolveName(comment.authorId),
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
	resolveName,
}: {
	editor: Editor
	thread: TLCommentThread
	focusedId: string | null
	currentUserId: string | null
	resolveName(id: string): string
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
						<CommentCard
							key={comment.id}
							{...commentToCardProps(comment, resolveName, currentUserId)}
						/>
					))}
				</div>
			)}
		</div>
	)
}

/** The composer for a comment being placed by the comment tool, anchored at the click point. */
function ThreadComposer({
	editor,
	pending,
	authorId,
}: {
	editor: Editor
	pending: PendingComment
	authorId: string
}) {
	const [text, setText] = useState('')

	// Track the click point through the camera so the composer stays put as you pan/zoom.
	const point = useValue('composer point', () => editor.pageToViewport(pending.point), [
		editor,
		pending.point,
	])

	const composerRef = useRef<HTMLDivElement>(null)

	// Dismiss the composer on a click anywhere outside it. Capture-phase so we see the
	// pointerdown before the wrapper's stopPropagation (and before the editor consumes it).
	useEffect(() => {
		const onPointerDown = (e: PointerEvent) => {
			const el = composerRef.current
			if (el && !el.contains(e.target as Node)) {
				pendingComment.set(null)
			}
		}
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => document.removeEventListener('pointerdown', onPointerDown, true)
	}, [])

	const submit = () => {
		const trimmed = text.trim()
		if (!trimmed) return
		// Comment mutations are not undoable (see design notes): run with history: 'ignore'.
		editor.run(
			() => {
				const pageId = editor.getCurrentPageId()
				// a new thread at the placed anchor, with its first comment
				const thread = createCommentThread({
					pageId,
					anchor: pending.anchor,
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
		pendingComment.set(null)
	}

	return (
		<div
			ref={composerRef}
			onPointerDown={(e) => e.stopPropagation()}
			onKeyDown={(e) => {
				if (e.key === 'Escape') pendingComment.set(null)
			}}
			style={{
				position: 'absolute',
				left: point.x,
				top: point.y,
				transform: 'translateY(8px)',
				pointerEvents: 'all',
				zIndex: 300,
			}}
		>
			<CommentComposer
				author={authorId}
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
