import {
	CommentListItemProps,
	CommentsList,
	formatRelativeTime,
	isOpenInNewTabClick,
	richTextToPlaintext,
} from '@tldraw/commenting'
import { ReactNode, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { createDeepLinkString, TLRichText, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useMaybeApp } from '../../../hooks/useAppState'
import { defineMessages, F, useMsg } from '../../../utils/i18n'
import { categorizeCommentNotifications, CommentNotificationReason } from './commentNotifications'
import styles from './notifications.module.css'

const messages = defineMessages({
	title: { defaultMessage: 'Notifications' },
	markAllRead: { defaultMessage: 'Mark all as read' },
	empty: { defaultMessage: 'You’re all caught up.' },
	unknownAuthor: { defaultMessage: 'Someone' },
	untitledFile: { defaultMessage: 'Untitled file' },
})

/** Byline for a notification row, phrased by why it's there. `<name>` wraps the author's name. */
function ReasonByline({
	reason,
	author,
	nameClassName,
}: {
	reason: CommentNotificationReason
	author: string
	nameClassName: string
}) {
	const name = (chunks: ReactNode) => <span className={nameClassName}>{chunks}</span>
	switch (reason) {
		case 'mention':
			return <F defaultMessage="<name>{author}</name> mentioned you" values={{ author, name }} />
		case 'reply':
			return <F defaultMessage="<name>{author}</name> replied" values={{ author, name }} />
		case 'owned-board':
			return (
				<F
					defaultMessage="<name>{author}</name> commented on your board"
					values={{ author, name }}
				/>
			)
	}
}

/**
 * Comments surfaced as notifications. The `comments` synced query already filters to the three
 * categories that concern the user server-side — comments on boards they own, replies in threads
 * they're a part of, and `@`-mentions of them — so out-of-category comments never reach the
 * client; {@link categorizeCommentNotifications} tags each synced comment with why it's there,
 * newest first, and drops reply-only thread history from before the user joined. Also returns
 * the caller's unread count over that set (a notification is unread when it has no read
 * receipt). Shared by the trigger button (for its badge) and the panel (for its list).
 */
export function useCommentNotifications() {
	const app = useMaybeApp()
	return useValue(
		'comment notifications',
		() => {
			const notifications = categorizeCommentNotifications(app?.getComments() ?? [], app?.userId)
			const unreadCount = notifications.filter((n) => !n.comment.read).length
			return { notifications, unreadCount }
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
	const { notifications, unreadCount } = useCommentNotifications()
	const title = useMsg(messages.title)
	const markAllReadLbl = useMsg(messages.markAllRead)
	const empty = useMsg(messages.empty)
	const unknownAuthor = useMsg(messages.unknownAuthor)
	const untitledFile = useMsg(messages.untitledFile)

	const items: CommentListItemProps[] = notifications.map(({ comment: c }) => ({
		id: c.id,
		author: {
			// never fall back to the raw id: an opaque uuid as a byline reads as a bug, and the rest
			// of the commenting UI says "Someone" for an unresolvable author
			name: c.authorName || unknownAuthor,
			color: c.authorColor || undefined,
		},
		preview: richTextToPlaintext(c.body as TLRichText),
		date: new Date(c.createdAt).toISOString(),
		// the document the comment lives on — the headline of the notification row
		page: c.file?.name || untitledFile,
		// a real link target, so browser affordances (ctrl/cmd-click, middle-click) open a new tab
		href: commentLink(c.fileId, c.thread?.shapeId, c.id),
	}))

	// Row id → why it's a notification, so the byline can be phrased per reason.
	const reasonById = new Map(notifications.map((n) => [n.comment.id, n.primaryReason]))

	const handleSelect = useCallback(
		(id: string, isNewTab: boolean) => {
			const n = notifications.find((n) => n.comment.id === id)
			if (!n) return
			if (!n.comment.read) app?.markCommentRead(n.comment.id)
			// keep the popover open when opening in a new tab, so more can be opened
			if (!isNewTab) onClose()
		},
		[notifications, app, onClose]
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
							for (const { comment: c } of notifications) {
								if (!c.read) app.markCommentRead(c.id)
							}
						}}
						disabled={unreadCount === 0}
					>
						{markAllReadLbl}
					</button>
				}
				empty={empty}
				renderItem={(item) => (
					<Link
						key={item.id}
						to={item.href!}
						className="tlui-cmt-list__item"
						onClick={(e) => handleSelect(item.id, isOpenInNewTabClick(e))}
						// middle-click opens the tab natively without firing onClick; still mark it read
						onAuxClick={(e) => e.button === 1 && handleSelect(item.id, true)}
					>
						<div className="tlui-cmt-list__item-body">
							<div className={styles.head}>
								<span className={styles.docTitle}>{item.page}</span>
								<span className={styles.time}>{formatRelativeTime(item.date)}</span>
							</div>
							<div className={styles.byline}>
								<ReasonByline
									reason={reasonById.get(item.id) ?? 'owned-board'}
									author={item.author.name}
									nameClassName={styles.author}
								/>
							</div>
							<div className={styles.preview}>{item.preview}</div>
						</div>
					</Link>
				)}
			/>
		</div>
	)
}
