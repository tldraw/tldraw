import {
	CommentListItemProps,
	CommentsList,
	formatFullDateTime,
	formatRelativeTime,
	isOpenInNewTabClick,
	Reactions,
	richTextToPlaintext,
	summarizeReactions,
} from '@tldraw/commenting'
import { ReactNode, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
	createDeepLinkString,
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiTooltip,
	TLRichText,
	useValue,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useMaybeApp } from '../../../hooks/useAppState'
import { defineMessages, F, useIntl, useMsg } from '../../../utils/i18n'
import { TLA_MENU_POSITION } from '../../tla-menu/tla-menu'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
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
	moreOptions: { defaultMessage: 'Notification options' },
	close: { defaultMessage: 'Close' },
	filterAll: { defaultMessage: 'All' },
	filterUnread: { defaultMessage: 'Unread' },
	markAllRead: { defaultMessage: 'Mark all as read' },
	empty: { defaultMessage: 'You’re all caught up.' },
	unknownAuthor: { defaultMessage: 'Someone' },
})

type NotificationFilter = 'all' | 'unread'

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

/** Uses the dotcom sidebar's menu primitives (not the canvas comment menus), so it renders without an editor. */
function NotificationsOverflowMenu({
	filter,
	onFilterChange,
	onMarkAllRead,
	hasUnread,
}: {
	filter: NotificationFilter
	onFilterChange(filter: NotificationFilter): void
	onMarkAllRead(): void
	hasUnread: boolean
}) {
	const moreLbl = useMsg(messages.moreOptions)
	const allLbl = useMsg(messages.filterAll)
	const unreadLbl = useMsg(messages.filterUnread)
	const markAllReadLbl = useMsg(messages.markAllRead)

	return (
		<TldrawUiDropdownMenuRoot id="notifications-overflow">
			<TldrawUiMenuContextProvider type="menu" sourceId="menu">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton type="icon" title={moreLbl} className="tlui-cmt-header-btn">
						<TlaIcon icon="dots-vertical-strong" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end" {...TLA_MENU_POSITION}>
					<TldrawUiMenuGroup id="notifications-filter">
						<TldrawUiMenuCheckboxItem
							id="filter-all"
							label={allLbl}
							checked={filter === 'all'}
							onSelect={() => onFilterChange('all')}
							readonlyOk
						/>
						<TldrawUiMenuCheckboxItem
							id="filter-unread"
							label={unreadLbl}
							checked={filter === 'unread'}
							onSelect={() => onFilterChange('unread')}
							readonlyOk
						/>
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="notifications-actions">
						<TldrawUiMenuItem
							id="mark-all-read"
							label={markAllReadLbl}
							onSelect={onMarkAllRead}
							disabled={!hasUnread}
							readonlyOk
						/>
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
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
 * but renders each row person-first — an author-coloured pin and a name-led byline (who, and why
 * you're being notified), the comment preview and any reaction pills beneath, and an unread dot.
 */
export function TlaSidebarNotificationsPanel({ onClose }: { onClose(): void }) {
	const app = useMaybeApp()
	const { notifications, unreadCount } = useCommentNotifications()
	const [filter, setFilter] = useState<NotificationFilter>('all')
	const title = useMsg(messages.title)
	const closeLbl = useMsg(messages.close)
	const empty = useMsg(messages.empty)
	const unknownAuthor = useMsg(messages.unknownAuthor)
	const { locale } = useIntl()

	const visible = filter === 'unread' ? notifications.filter((n) => n.unread) : notifications

	const items: CommentListItemProps[] = visible.map((n) => {
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
			// a real link target, so browser affordances (ctrl/cmd-click, middle-click) open a new tab
			href: commentLink(c.fileId, c.thread?.shapeId, c.id),
		}
	})

	// Row id → its notification, for the byline's reason/reactors and the unread dot.
	const notificationById = new Map(visible.map((n) => [n.comment.id, n]))

	const markAllRead = useCallback(() => {
		if (!app) return
		// one batched mutation rather than one markRead per comment. A reaction entry carries its
		// own unread state (a fresh reaction re-unreads a read comment), so this filters on the
		// entry rather than on the comment's receipt — and repeats are fine, since the mutator
		// dedupes the batch.
		app.markCommentsRead(notifications.filter((n) => n.unread).map((n) => n.comment.id))
	}, [app, notifications])

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
					<div className="tlui-cmt-list__header-actions">
						<NotificationsOverflowMenu
							filter={filter}
							onFilterChange={setFilter}
							onMarkAllRead={markAllRead}
							hasUnread={unreadCount > 0}
						/>
						<TldrawUiButton
							type="icon"
							title={closeLbl}
							className="tlui-cmt-header-btn"
							onClick={onClose}
						>
							<TlaIcon icon="close" style={{ width: 12, height: 12 }} />
						</TldrawUiButton>
					</div>
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
							<span
								className={styles.pin}
								style={{ backgroundColor: item.author.color }}
								aria-hidden="true"
							/>
							<div className="tlui-cmt-list__item-body">
								<div className={styles.head}>
									<span className={styles.byline}>
										<ReasonByline
											reason={n?.primaryReason ?? 'owned-board'}
											author={item.author.name}
											reactors={summarizeForeignReactors(n?.comment.reactions, app?.userId)}
											nameClassName={styles.author}
										/>
									</span>
									<TldrawUiTooltip content={formatFullDateTime(item.date, locale)}>
										<span className={styles.time}>{formatRelativeTime(item.date)}</span>
									</TldrawUiTooltip>
								</div>
								<div className={styles.preview}>{item.preview}</div>
								{item.reactions && (
									<Reactions reactions={item.reactions} canReact={false} enableHoverList={false} />
								)}
							</div>
							{n?.unread && <span className={styles.unreadDot} aria-hidden="true" />}
						</Link>
					)
				}}
			/>
		</div>
	)
}
