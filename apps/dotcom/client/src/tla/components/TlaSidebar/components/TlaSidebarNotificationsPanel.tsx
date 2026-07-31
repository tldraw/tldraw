import {
	CommentListItemProps,
	CommentsList,
	formatRelativeTime,
	isOpenInNewTabClick,
	Reactions,
	richTextToPlaintext,
	summarizeReactions,
} from '@tldraw/commenting'
import { ReactNode, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { createDeepLinkString, TLRichText, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useMaybeApp } from '../../../hooks/useAppState'
import { defineMessages, F, useMsg } from '../../../utils/i18n'
import {
	buildReactionNotifications,
	categorizeCommentNotifications,
	CommentNotificationReason,
	mergeNotifications,
	summarizeForeignReactors,
} from './commentNotifications'
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
	reactors,
	nameClassName,
}: {
	reason: CommentNotificationReason
	author: string
	/** Who reacted, for the `reaction` phrasing — see {@link summarizeForeignReactors}. */
	reactors: { names: string[]; others: number; total: number }
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
		case 'reaction': {
			const { names, others, total } = reactors
			const [a, b] = names
			if (names.length === 0) {
				return (
					<F
						defaultMessage="{count, plural, one {Someone reacted to your comment} other {# people reacted to your comment}}"
						values={{ count: total }}
					/>
				)
			}
			if (names.length === 1 && others === 0) {
				return (
					<F
						defaultMessage="<name>{author}</name> reacted to your comment"
						values={{ author: a, name }}
					/>
				)
			}
			if (names.length === 2 && others === 0) {
				return (
					<F
						defaultMessage="<name>{a}</name> and <name>{b}</name> reacted to your comment"
						values={{ a, b, name }}
					/>
				)
			}
			if (names.length === 1) {
				return (
					<F
						defaultMessage="<name>{author}</name> and {count, plural, one {# other} other {# others}} reacted to your comment"
						values={{ author: a, count: others, name }}
					/>
				)
			}
			return (
				<F
					defaultMessage="<name>{a}</name>, <name>{b}</name> and {count, plural, one {# other} other {# others}} reacted to your comment"
					values={{ a, b, count: others, name }}
				/>
			)
		}
	}
}

/**
 * Comments and reactions surfaced as notifications, merged from the `comments` and `reactions`
 * synced queries and sorted by timestamp. {@link categorizeCommentNotifications} and
 * {@link buildReactionNotifications} do the per-feed shaping. Shared by trigger button and panel.
 */
export function useCommentNotifications() {
	const app = useMaybeApp()
	return useValue(
		'comment notifications',
		() => {
			const comments = categorizeCommentNotifications(app?.getComments() ?? [], app?.userId)
			const reactionEntries = buildReactionNotifications(app?.getReactions() ?? [], app?.userId)
			const notifications = mergeNotifications(comments, reactionEntries)
			const unreadCount = notifications.filter((n) => n.unread).length
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

	const items: CommentListItemProps[] = notifications.map((n) => {
		const c = n.comment
		return {
			id: c.id,
			author: {
				// never fall back to the raw id: an opaque uuid as a byline reads as a bug, and the rest
				// of the commenting UI says "Someone" for an unresolvable author
				name: c.authorName || unknownAuthor,
				color: c.authorColor || undefined,
			},
			preview: richTextToPlaintext(c.body as TLRichText),
			// the notified-about event: a reaction entry dates from its newest foreign reaction,
			// not from the (older) comment it decorates
			date: new Date(n.timestamp).toISOString(),
			// inert pills: no toggling from the panel, emoji + count with the user's own
			// reactions highlighted
			reactions: summarizeReactions(
				c.reactions ?? [],
				app?.userId,
				(id) => c.reactions?.find((r) => r.userId === id)?.userName || undefined
			),
			// the document the comment lives on — the headline of the notification row
			page: c.file?.name || untitledFile,
			// a real link target, so browser affordances (ctrl/cmd-click, middle-click) open a new tab
			href: commentLink(c.fileId, c.thread?.shapeId, c.id),
		}
	})

	// Row id → its notification, so the byline can be phrased per reason and reactor count.
	const notificationById = new Map(notifications.map((n) => [n.comment.id, n]))

	const handleSelect = useCallback(
		(id: string, isNewTab: boolean) => {
			const n = notifications.find((n) => n.comment.id === id)
			if (!n) return
			if (n.unread) app?.markCommentRead(n.comment.id)
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
							for (const n of notifications) {
								if (n.unread) app.markCommentRead(n.comment.id)
							}
						}}
						disabled={unreadCount === 0}
					>
						{markAllReadLbl}
					</button>
				}
				empty={empty}
				renderItem={(item) => {
					const n = notificationById.get(item.id)
					return (
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
										reason={n?.primaryReason ?? 'owned-board'}
										author={item.author.name}
										reactors={summarizeForeignReactors(n?.comment.reactions, app?.userId)}
										nameClassName={styles.author}
									/>
								</div>
								<div className={styles.preview}>{item.preview}</div>
								{item.reactions && (
									<Reactions reactions={item.reactions} canReact={false} enableHoverList={false} />
								)}
							</div>
						</Link>
					)
				}}
			/>
		</div>
	)
}
