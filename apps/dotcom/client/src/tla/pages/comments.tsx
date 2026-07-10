/* eslint-disable tldraw/jsx-no-literals */
import { Link } from 'react-router-dom'
import { createDeepLinkString, TLRichText, useValue } from 'tldraw'
import { routes } from '../../routeDefs'
import { useMaybeApp } from '../hooks/useAppState'
import { richTextToPlaintext } from '../utils/richText'

/** Link to a file, deep-linked to the comment's shape (when shape-anchored), with the comment id so its popover opens. */
function commentLink(fileId: string, shapeId: string | null | undefined, commentId: string) {
	const base = `${routes.tlaFile(fileId)}?comment=${encodeURIComponent(commentId)}`
	if (!shapeId) return base
	const d = createDeepLinkString({ type: 'shapes', shapeIds: [shapeId as any] })
	return `${base}&d=${d}`
}

/**
 * App-level, cross-document comments view. Reads the Zero `comments` synced query (scoped
 * server-side to files the user can access) — separate from the in-document view, which reads
 * comments from the tldraw file room.
 */
export function Component() {
	const app = useMaybeApp()
	const comments = useValue(
		'comments',
		() => [...(app?.getComments() ?? [])].sort((a, b) => b.createdAt - a.createdAt),
		[app]
	)

	return (
		<div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
			<h1>Comments</h1>
			<p style={{ opacity: 0.7 }}>All comments across files you can access.</p>
			{comments.length === 0 ? (
				<p>No comments yet.</p>
			) : (
				<ul style={{ listStyle: 'none', padding: 0 }}>
					{comments.map((c) => {
						const isOwn = c.authorId === app?.userId
						const unread = !isOwn && c.reads.length === 0
						return (
							<li
								key={c.id}
								style={{
									border: '1px solid #eee',
									borderRadius: 8,
									padding: 12,
									marginBottom: 8,
									opacity: unread ? 1 : 0.6,
								}}
							>
								{/* bodies are rich text; flatten for this basic UI (rich rendering forthcoming) */}
								{/* zero types json columns as opaque JSON */}
								<div
									style={{
										whiteSpace: 'pre-wrap',
										wordBreak: 'break-word',
										fontWeight: unread ? 600 : 400,
									}}
								>
									{unread && (
										<span
											aria-label="Unread"
											style={{
												display: 'inline-block',
												width: 8,
												height: 8,
												borderRadius: '50%',
												background: 'var(--tl-color-primary)',
												marginRight: 8,
											}}
										/>
									)}
									{richTextToPlaintext(c.body as TLRichText)}
								</div>
								<div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
									<span>{c.author?.name ?? c.authorId}</span>
									<span> · </span>
									<Link
										style={{ color: 'var(--tl-color-primary)' }}
										to={commentLink(c.fileId, c.thread?.shapeId, c.id)}
									>
										{c.file?.name || c.fileId}
									</Link>
									{!isOwn && (
										<>
											<span> · </span>
											<button
												style={{
													border: 'none',
													background: 'none',
													padding: 0,
													cursor: 'pointer',
													color: 'var(--tl-color-primary)',
													font: 'inherit',
												}}
												onClick={() =>
													unread ? app?.markCommentRead(c.id) : app?.markCommentUnread(c.id)
												}
											>
												{unread ? 'Mark read' : 'Mark unread'}
											</button>
										</>
									)}
								</div>
							</li>
						)
					})}
				</ul>
			)}
		</div>
	)
}
