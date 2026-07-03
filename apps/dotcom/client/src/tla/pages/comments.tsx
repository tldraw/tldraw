/* eslint-disable tldraw/jsx-no-literals */
import { Link } from 'react-router-dom'
import { createDeepLinkString, useValue } from 'tldraw'
import { routes } from '../../routeDefs'
import { useMaybeApp } from '../hooks/useAppState'
import { richTextToPlaintext } from '../utils/richText'

/** Link to a file, deep-linked to the comment's shape, with the comment id so its popover opens. */
function commentLink(fileId: string, shapeId: string, commentId: string) {
	const d = createDeepLinkString({ type: 'shapes', shapeIds: [shapeId as any] })
	return `${routes.tlaFile(fileId)}?d=${d}&comment=${encodeURIComponent(commentId)}`
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
		() => [...((app?.getComments() ?? []) as any[])].sort((a, b) => b.createdAt - a.createdAt),
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
					{comments.map((c) => (
						<li
							key={c.id}
							style={{
								border: '1px solid #eee',
								borderRadius: 8,
								padding: 12,
								marginBottom: 8,
							}}
						>
							{/* bodies are rich text; flatten for this basic UI (rich rendering forthcoming) */}
							<div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
								{richTextToPlaintext(c.body)}
							</div>
							<div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
								<span>{c.author?.name ?? c.authorId}</span>
								<span> · </span>
								<Link
									style={{ color: 'var(--tl-color-primary)' }}
									to={commentLink(c.fileId, c.shapeId, c.id)}
								>
									{c.file?.name || c.fileId}
								</Link>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
