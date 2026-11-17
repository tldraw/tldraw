import {
	CommentListItemProps,
	CommentsList,
	formatFullDateTime,
	formatRelativeTime,
	isOpenInNewTabClick,
} from '@tldraw/commenting'
import classNames from 'classnames'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
	defineMessages,
	F,
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiIcon,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiTooltip,
	useTranslation,
} from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'
import { commentLink, reactionBylineMessage } from './commentNotifications'
import {
	EnrichedCommentNotification,
	useCommentNotifications,
	useEnrichedNotifications,
} from './useCommentNotifications'
import styles from './notifications.module.css'

const messages = defineMessages({
	title: { defaultMessage: 'Notifications' },
	moreOptions: { defaultMessage: 'Notification options' },
	filterAll: { defaultMessage: 'All' },
	filterUnread: { defaultMessage: 'Unread' },
	markAllRead: { defaultMessage: 'Mark all as read' },
	empty: { defaultMessage: 'You’re all caught up.' },
})

type NotificationFilter = 'all' | 'unread'

/** Byline for a notification row, phrased by why it's there. `<name>` wraps the author's name. */
function ReasonByline({
	notification: n,
	nameClassName,
}: {
	notification: EnrichedCommentNotification
	nameClassName: string
}) {
	const name = (chunks: ReactNode) => <span className={nameClassName}>{chunks}</span>
	const author = n.authorName
	switch (n.primaryReason) {
		case 'mention':
			return <F defaultMessage="<name>{author}</name> mentioned you" values={{ author, name }} />
		case 'reply':
			return <F defaultMessage="<name>{author}</name> replied" values={{ author, name }} />
		case 'owned-board':
			return <F defaultMessage="<name>{author}</name> commented" values={{ author, name }} />
		case 'reaction': {
			const { message, values } = reactionBylineMessage(n.reactors!)
			// eslint-disable-next-line tldraw/enforce-default-message
			return <F {...message} values={{ ...values, name }} />
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
	const msg = useTranslation()

	return (
		<TldrawUiDropdownMenuRoot id="notifications-overflow">
			<TldrawUiMenuContextProvider type="menu" sourceId="menu">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						type="icon"
						title={msg(messages.moreOptions)}
						className="tlui-cmt-icon-btn"
					>
						<TldrawUiIcon icon="dots-vertical" label={msg(messages.moreOptions)} small />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={0} sideOffset={0}>
					<TldrawUiMenuGroup id="notifications-filter">
						<TldrawUiMenuCheckboxItem
							id="filter-all"
							label={msg(messages.filterAll)}
							checked={filter === 'all'}
							onSelect={() => onFilterChange('all')}
							readonlyOk
						/>
						<TldrawUiMenuCheckboxItem
							id="filter-unread"
							label={msg(messages.filterUnread)}
							checked={filter === 'unread'}
							onSelect={() => onFilterChange('unread')}
							readonlyOk
						/>
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="notifications-actions">
						<TldrawUiMenuItem
							id="mark-all-read"
							label={msg(messages.markAllRead)}
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
 * Notifications popover contents. Reuses the comments sidebar's list shell (header, scroll, empty)
 * but renders each row person-first — an author-coloured pin and a name-led byline (who, and why
 * you're being notified), the comment preview beneath, and an unread dot.
 */
export function TlaSidebarNotificationsPanel({ onClose }: { onClose(): void }) {
	const msg = useTranslation()
	const app = useMaybeApp()
	const { notifications, unreadCount } = useCommentNotifications()
	const [filter, setFilter] = useState<NotificationFilter>('all')
	const { locale } = useIntl()

	const visibleRows = useMemo(
		() => (filter === 'unread' ? notifications.filter((n) => n.unread) : notifications),
		[filter, notifications]
	)
	const visible = useEnrichedNotifications(visibleRows)

	const items: CommentListItemProps[] = visible.map((n) => {
		const c = n.comment
		return {
			id: c.id,
			author: { name: n.authorName, color: c.authorColor || undefined },
			preview: n.preview,
			// the notified-about event: a reaction entry dates from its newest foreign reaction,
			// not from the (older) comment it decorates
			date: new Date(n.timestamp).toISOString(),
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
				header={msg(messages.title)}
				headerAction={
					<div className="tlui-cmt-list__header-actions">
						<NotificationsOverflowMenu
							filter={filter}
							onFilterChange={setFilter}
							onMarkAllRead={markAllRead}
							hasUnread={unreadCount > 0}
						/>
					</div>
				}
				empty={msg(messages.empty)}
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
								<div className={classNames('tlui-cmt-head', styles.head)}>
									<span
										className={styles.pin}
										style={{ backgroundColor: item.author.color }}
										aria-hidden="true"
									/>
									<span className={styles.byline}>
										{n && <ReasonByline notification={n} nameClassName={styles.author} />}
									</span>
									<TldrawUiTooltip content={formatFullDateTime(item.date, locale)}>
										<span className={styles.time}>{formatRelativeTime(item.date)}</span>
									</TldrawUiTooltip>
								</div>
								<div className="tlui-cmt-body">
									<div className="tlui-cmt-list__item-preview">{item.preview}</div>
								</div>
							</div>
							{n?.unread && <span className={styles.unreadDot} aria-hidden="true" />}
						</Link>
					)
				}}
			/>
		</div>
	)
}
