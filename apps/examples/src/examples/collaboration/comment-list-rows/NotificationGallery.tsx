import { CommentAuthor, CommentsList, formatRelativeTime } from '@tldraw/commenting'
import { ReactNode } from 'react'
import { TldrawUiButton, TldrawUiIcon } from 'tldraw'
import {
	ada,
	ago,
	DAY,
	grace,
	HOUR,
	LONG_URL,
	longName,
	MANY_LINES,
	ONE_LINE,
	RTL,
	SHORT,
	steve,
	TWO_LINES,
} from './fixtures'
// [1]
import styles from '../../../../../dotcom/client/src/tla/components/TlaSidebar/components/notifications.module.css'

const name = (author: CommentAuthor | string) => (
	<span className={styles.author}>{typeof author === 'string' ? author : author.name}</span>
)

interface NotificationFixture {
	author?: CommentAuthor
	/** The name-led reason line, as `ReasonByline` phrases it. */
	headline: ReactNode
	preview: string
	date?: string
	unread?: boolean
}

const GROUPS: { title: string; items: NotificationFixture[] }[] = [
	{
		title: 'Reasons',
		items: [
			{ author: ada, headline: <>{name(ada)} commented</>, preview: ONE_LINE },
			{ author: grace, headline: <>{name(grace)} replied</>, preview: ONE_LINE },
			{ author: ada, headline: <>{name(ada)} mentioned you</>, preview: '@Steve Ruiz ok' },
			{
				author: ada,
				headline: <>{name(ada)} reacted</>,
				preview: ONE_LINE,
			},
			{
				author: ada,
				headline: (
					<>
						{name(ada)} and {name(grace)} reacted
					</>
				),
				preview: ONE_LINE,
			},
			{
				author: ada,
				headline: <>{name(ada)} and 1 other reacted</>,
				preview: ONE_LINE,
			},
			{
				author: ada,
				headline: (
					<>
						{name(ada)}, {name(grace)} and 12 others reacted
					</>
				),
				preview: ONE_LINE,
			},
			{ headline: 'Someone reacted', preview: ONE_LINE },
			{ headline: '14 people reacted', preview: ONE_LINE },
			{ headline: <>{name('Someone')} commented</>, preview: ONE_LINE },
		],
	},
	{
		title: 'Unread, names and times',
		items: [
			{ author: ada, headline: <>{name(ada)} commented</>, preview: ONE_LINE, unread: true },
			{
				author: ada,
				headline: <>{name(ada)} mentioned you</>,
				preview: MANY_LINES,
				unread: true,
				date: ago(10_000),
			},
			{
				author: longName,
				headline: <>{name(longName)} commented</>,
				preview: ONE_LINE,
			},
			{
				author: longName,
				headline: <>{name(longName)} mentioned you</>,
				preview: ONE_LINE,
				unread: true,
				date: ago(250 * DAY),
			},
			{
				author: longName,
				headline: (
					<>
						{name(longName)}, {name(longName)} and 128 others reacted
					</>
				),
				preview: TWO_LINES,
				unread: true,
				date: ago(250 * DAY),
			},
			{
				author: ada,
				headline: (
					<>
						{name(ada)} and {name(longName)} reacted
					</>
				),
				preview: ONE_LINE,
			},
			{ author: grace, headline: <>{name(grace)} replied</>, preview: SHORT, date: ago(3 * DAY) },
			{
				author: grace,
				headline: <>{name(grace)} replied</>,
				preview: SHORT,
				date: ago(800 * DAY),
				unread: true,
			},
			{ author: { name: 'Al' }, headline: <>{name('Al')} commented</>, preview: SHORT },
		],
	},
	{
		title: 'Text length',
		items: [
			{ author: steve, headline: <>{name(steve)} commented</>, preview: SHORT },
			{ author: steve, headline: <>{name(steve)} commented</>, preview: TWO_LINES },
			{ author: steve, headline: <>{name(steve)} commented</>, preview: MANY_LINES },
			{
				author: steve,
				headline: <>{name(steve)} commented</>,
				preview: MANY_LINES,
				unread: true,
			},
			{ author: steve, headline: <>{name(steve)} commented</>, preview: LONG_URL, unread: true },
			{ author: steve, headline: <>{name(steve)} commented</>, preview: RTL },
			{ author: steve, headline: <>{name(steve)} commented</>, preview: '👍' },
			{ author: steve, headline: <>{name(steve)} commented</>, preview: '' },
		],
	},
	{ title: 'Empty', items: [] },
	{
		title: 'One row',
		items: [{ author: ada, headline: <>{name(ada)} commented</>, preview: SHORT, unread: true }],
	},
]

function IconButton({ icon, label }: { icon: string; label: string }) {
	return (
		<TldrawUiButton type="icon" title={label} className="tlui-cmt-icon-btn">
			<TldrawUiIcon icon={icon} label={label} small />
		</TldrawUiButton>
	)
}

export function NotificationGallery({ width }: { width: number | null }) {
	return (
		<>
			{GROUPS.map((group) => (
				<div key={group.title} style={{ flexShrink: 0 }}>
					<div style={{ fontSize: 12, marginBottom: 8, color: 'var(--tl-color-text-3)' }}>
						{group.title}
					</div>
					<div
						className={styles.wrap}
						style={{
							// The popover's own width is 300px; its 60vh height cap is lifted so every row shows.
							...(width === null ? {} : { width }),
							maxHeight: 'none',
							background: 'var(--tl-color-panel)',
							borderRadius: 'var(--tl-radius-4)',
							boxShadow: 'var(--tl-shadow-3)',
							overflow: 'hidden',
						}}
					>
						<CommentsList
							items={group.items.map((item, i) => ({
								id: `${group.title}-${i}`,
								author: item.author ?? { name: 'Someone' },
								preview: item.preview,
								date: item.date ?? ago(7 * HOUR),
							}))}
							header="Notifications"
							headerAction={
								<div className="tlui-cmt-list__header-actions">
									<IconButton icon="dots-vertical" label="Notification options" />
									<IconButton icon="cross-2" label="Close" />
								</div>
							}
							empty="You’re all caught up."
							// [2]
							renderItem={(row) => {
								const item = group.items[Number(row.id.slice(group.title.length + 1))]
								return (
									<a
										href="#notification"
										className="tlui-cmt-list__item"
										onClick={(e) => e.preventDefault()}
									>
										<div className="tlui-cmt-list__item-body">
											<div className={`tlui-cmt-head ${styles.head}`}>
												<span
													className={styles.pin}
													style={{ backgroundColor: row.author.color }}
													aria-hidden="true"
												/>
												<span className={styles.byline}>{item.headline}</span>
												<span className={styles.time}>{formatRelativeTime(row.date)}</span>
											</div>
											<div className="tlui-cmt-body">
												<div className="tlui-cmt-list__item-preview">{row.preview}</div>
											</div>
										</div>
										{item.unread && <span className={styles.unreadDot} aria-hidden="true" />}
									</a>
								)
							}}
						/>
					</div>
				</div>
			))}
		</>
	)
}

/*
[1]
The notifications popover belongs to tldraw.com, not the SDK, so there's no component to import.
The rows below use the app's own stylesheet, so the spacing shown here is the real thing.

[2]
The same markup as the row in the app's `TlaSidebarNotificationsPanel`, minus its router link,
read-state wiring and the tooltip on the time. If that row changes, change this one to match.
*/
