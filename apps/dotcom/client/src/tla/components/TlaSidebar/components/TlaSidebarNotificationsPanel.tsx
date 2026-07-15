import { CommentListItemProps, CommentsList, formatRelativeTime } from '@tldraw/commenting'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDeepLinkString, TLRichText, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useMaybeApp } from '../../../hooks/useAppState'
import { defineMessages, F, useMsg } from '../../../utils/i18n'
import { richTextToPlaintext } from '../../../utils/richText'
import styles from './notifications.module.css'

const messages = defineMessages({
	title: { defaultMessage: 'Notifications' },
	markAllRead: { defaultMessage: 'Mark all as read' },
	empty: { defaultMessage: 'You’re all caught up.' },
})

/**
 * Comments surfaced as notifications: every comment on a file the user can access, newest first,
 * plus the caller's unread count (a comment is unread when it isn't the caller's own and has no
 * read receipt). Shared by the trigger button (for its badge) and the panel (for its list).
 */
export function useCommentNotifications() {
	const app = useMaybeApp()
	return useValue(
		'comment notifications',
		() => {
			const comments = [...(app?.getComments() ?? [])].sort((a, b) => b.createdAt - a.createdAt)
			const unreadCount = comments.filter((c) => c.authorId !== app?.userId && !c.read).length
			return { comments, unreadCount }
		},
		[app]
	)
}

/** Deep link to a comment's file, anchored to its shape (when shape-anchored) so its popover opens. */
function commentLink(fileId: string, shapeId: string | null | undefined, commentId: string) {
	const base = `${routes.tlaFile(fileId)}?comment=${encodeURIComponent(commentId)}`
	if (!shapeId) return base
	const d = createDeepLinkString({ type: 'shapes', shapeIds: [shapeId as any] })
	return `${base}&d=${d}`
}

/**
 * Notifications popover contents. Reuses the comments sidebar's list shell (header, scroll, empty)
 * but renders each row document-first — the file title leads, with who-commented and the comment
 * preview as supporting detail — since a notification is about a document, not a person.
 */
export function TlaSidebarNotificationsPanel({ onClose }: { onClose(): void }) {
	const app = useMaybeApp()
	const navigate = useNavigate()
	const { comments, unreadCount } = useCommentNotifications()
	const title = useMsg(messages.title)
	const markAllReadLbl = useMsg(messages.markAllRead)
	const empty = useMsg(messages.empty)

	const items: CommentListItemProps[] = comments.map((c) => ({
		id: c.id,
		author: c.author?.name ?? c.authorId,
		preview: richTextToPlaintext(c.body as TLRichText),
		date: new Date(c.createdAt).toISOString(),
		// the document the comment lives on — the headline of the notification row
		page: c.file?.name || c.fileId,
	}))

	const handleSelect = useCallback(
		(id: string) => {
			const c = comments.find((c) => c.id === id)
			if (!c) return
			if (c.authorId !== app?.userId && !c.read) app?.markCommentRead(c.id)
			navigate(commentLink(c.fileId, c.thread?.shapeId, c.id))
			onClose()
		},
		[comments, app, navigate, onClose]
	)

	return (
		<div className={styles.wrap}>
			<CommentsList
				items={items}
				header={title}
				headerAction={
					<button
						type="button"
						className={styles.markAll}
						onClick={() => {
							if (!app) return
							for (const c of comments) {
								if (c.authorId !== app.userId && !c.read) app.markCommentRead(c.id)
							}
						}}
						disabled={unreadCount === 0}
					>
						{markAllReadLbl}
					</button>
				}
				empty={empty}
				renderItem={(item) => (
					<button
						key={item.id}
						type="button"
						className="cmt-list__item"
						onClick={() => handleSelect(item.id)}
					>
						<div className="cmt-list__item-body">
							<div className={styles.head}>
								<span className={styles.docTitle}>{item.page}</span>
								<span className={styles.time}>{formatRelativeTime(item.date)}</span>
							</div>
							<div className={styles.byline}>
								<F
									defaultMessage="<name>{author}</name> commented"
									values={{
										author: item.author,
										name: (chunks) => <span className={styles.author}>{chunks}</span>,
									}}
								/>
							</div>
							<div className={styles.preview}>{item.preview}</div>
						</div>
					</button>
				)}
			/>
		</div>
	)
}
