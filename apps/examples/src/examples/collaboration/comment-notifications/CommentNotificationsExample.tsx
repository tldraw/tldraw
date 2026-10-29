import {
	Avatar,
	CanvasComments,
	CommentAuthor,
	CommentNotificationLevel,
	CommentNotificationReason,
	commentToolOverrides,
	commentTools,
	filterMentionMembers,
	formatRelativeTime,
	getStoreCommentNotifications,
	isAtNotificationLevel,
	MentionMember,
	putCommentRecords,
	revealThread,
	richTextToPlaintext,
	showBrowserNotification,
	startCommentNotifier,
	useCommentThreads,
} from '@tldraw/commenting'
import { useEffect, useMemo } from 'react'
import {
	atom,
	commentSchemaRecords,
	createComment,
	createCommentThread,
	createShapeId,
	createTLSchema,
	createTLStore,
	Editor,
	TLComment,
	TLCommentId,
	TLCommentThread,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TLRichText,
	toRichText,
	uniqueId,
	useEditor,
	useValue,
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import './comment-notifications.css'

const ME = 'me'

const ADA_AVATAR =
	'data:image/svg+xml,' +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" fill="#0E9F6E"/><circle cx="14" cy="11" r="5" fill="#fff"/><ellipse cx="14" cy="24" rx="9" ry="7" fill="#fff"/></svg>`
	)

const MEMBERS: MentionMember[] = [
	{ id: ME, name: 'You', color: '#EC5E41', you: true },
	{ id: 'ada', name: 'Ada Lovelace', color: '#0E9F6E', image: ADA_AVATAR },
	{ id: 'grace', name: 'Grace Hopper', color: '#4465E9' },
]

const AUTHORS: Record<string, CommentAuthor> = Object.fromEntries(MEMBERS.map((m) => [m.id, m]))
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }
const resolveName = (id: string) => AUTHORS[id]?.name

// [1]
const readComments = atom<ReadonlySet<TLCommentId>>('read comments', new Set())

const isCommentUnread = (commentId: TLCommentId) => !readComments.get().has(commentId)

const onCommentsRead = (commentIds: TLCommentId[]) =>
	readComments.update((read) => {
		const unread = commentIds.filter((id) => !read.has(id))
		if (unread.length === 0) return read
		const next = new Set(read)
		for (const id of unread) next.add(id)
		return next
	})

// Your own comment is never news to you, so it's marked read the moment it's posted rather than
// waiting for the thread view to report it.
const onPostComment = (comment: TLComment) => onCommentsRead([comment.id])

/**
 * A comment body of the form `<before>@Name<after>`, as the composer would produce it. Empty
 * `before`/`after` segments are dropped — a zero-length text node is invalid rich text.
 */
function bodyMentioning(before: string, memberId: string, after: string): TLRichText {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					...(before ? [{ type: 'text', text: before }] : []),
					{ type: 'mention', attrs: { id: memberId, label: resolveName(memberId) ?? memberId } },
					...(after ? [{ type: 'text', text: after }] : []),
				],
			},
		],
	}
}

const REASON_LABEL: Record<CommentNotificationReason, string> = {
	mention: 'mentioned you',
	reply: 'replied in your thread',
	'owned-board': 'commented on your board',
	reaction: 'reacted to your comment',
}

// [2]
const getNotifications = (editor: Editor) =>
	getStoreCommentNotifications(editor, ME, { isCommentUnread })

// [3]
type DesktopLevel = 'off' | CommentNotificationLevel
const desktopLevel = atom<DesktopLevel>('desktop notification level', 'off')
const alsoWhenFocused = atom('also notify when focused', true)
const status = atom<string | null>('status', null)

async function setDesktopLevel(level: DesktopLevel) {
	if (level !== 'off' && (await Notification.requestPermission()) !== 'granted') {
		status.set('The browser didn’t allow notifications. Check the site’s permissions.')
		return
	}
	desktopLevel.set(level)
}

async function sendTestNotification() {
	if ((await Notification.requestPermission()) !== 'granted') {
		status.set('The browser didn’t allow notifications. Check the site’s permissions.')
		return
	}
	new Notification('Test notification', { body: 'Desktop notifications work in this browser.' })
	status.set('Test sent. Nothing on screen? See the note above.')
}

function useDesktopNotifications(editor: Editor) {
	useEffect(
		() =>
			startCommentNotifier({
				getNotifications: () => getNotifications(editor),
				isEnabled: () => desktopLevel.get() !== 'off',
				shouldShow: (n) => {
					const level = desktopLevel.get()
					return level !== 'off' && isAtNotificationLevel(n, level)
				},
				isWindowFocused: () =>
					!alsoWhenFocused.get() && document.visibilityState === 'visible' && document.hasFocus(),
				format: (n) => ({
					title: `${resolveAuthor(n.comment.authorId).name} ${REASON_LABEL[n.primaryReason]}`,
					body: richTextToPlaintext(n.comment.record.body, resolveName),
				}),
				show: (n, content, onClick) => {
					showBrowserNotification(n, content, onClick)
					status.set(`Notification sent: “${content.title}”. Click it to open the thread.`)
				},
				onClick: (n) => revealThread(editor, n.comment.record.id),
				// Each tab of this example has its own in-memory comments, so each needs its own lock.
				// With a synced store, one shared name keeps N tabs from notifying N times.
				lockName: `comment-notifications-example:${uniqueId()}`,
			}),
		[editor]
	)
}

const MINUTE = 60 * 1000

function handleMount(editor: Editor) {
	const boxId = createShapeId()
	editor.run(
		() => {
			editor.createShapes([
				{
					id: boxId,
					type: 'geo',
					x: 180,
					y: 140,
					props: { geo: 'rectangle', w: 260, h: 160, richText: toRichText('Hero image') },
				},
			])
		},
		{ history: 'ignore' }
	)

	const pageId = editor.getCurrentPageId()
	const now = Date.now()

	// A thread you started, with a reply from Ada — a `reply` notification.
	const yourThread = createCommentThread({
		pageId,
		anchor: { type: 'point', x: 540, y: 200 },
		createdBy: ME,
		now: now - 90 * MINUTE,
	})
	// A thread Ada started on the shape, mentioning you — a `mention` notification.
	const adaThread = createCommentThread({
		pageId,
		anchor: { type: 'shape', shapeId: boxId, x: 0.5, y: 0.5, isPrecise: true },
		createdBy: 'ada',
		now: now - 20 * MINUTE,
	})

	putCommentRecords(editor, [
		yourThread,
		adaThread,
		createComment({
			threadId: yourThread.id,
			pageId,
			authorId: ME,
			body: toRichText('Should this sit above the fold?'),
			now: now - 90 * MINUTE,
		}),
		createComment({
			threadId: yourThread.id,
			pageId,
			authorId: 'ada',
			body: toRichText('Yes — it reads as an afterthought where it is now.'),
			now: now - 45 * MINUTE,
		}),
		createComment({
			threadId: adaThread.id,
			pageId,
			authorId: 'ada',
			body: bodyMentioning('', ME, ' can you swap in the final crop?'),
			now: now - 20 * MINUTE,
		}),
	])

	// Padded well to the left of the content, so the fitted view leaves the strip under the inbox
	// panel empty and both seeded pins land in the clear.
	editor.zoomToBounds({ x: -160, y: 80, w: 900, h: 400 }, { immediate: true })
}

function NotificationsPanel() {
	const editor = useEditor()
	const threads = useCommentThreads(editor)
	// [4]
	const notifications = useValue('notifications', () => getNotifications(editor), [editor])
	const level = useValue(desktopLevel)
	const whenFocused = useValue(alsoWhenFocused)
	const statusText = useValue(status)
	useDesktopNotifications(editor)

	const unreadCount = notifications.filter((n) => n.unread).length

	// The newest thread you started, for Ada to reply into.
	const replyTarget = useMemo(
		() =>
			threads
				.filter((thread) => thread.createdBy === ME)
				.sort((a, b) => b.createdAt - a.createdAt)[0],
		[threads]
	)
	const mentionTarget = useMemo(
		() => [...threads].sort((a, b) => b.createdAt - a.createdAt)[0],
		[threads]
	)

	// [5]
	const postAsAda = (body: TLRichText, thread: TLCommentThread | undefined) => {
		if (!thread) return
		const post = () => {
			// set before the write: a notification it triggers replaces this with what was sent
			status.set(
				desktopLevel.get() === 'off'
					? 'Ada posted. Pick a level above to get a desktop notification too.'
					: 'Ada posted. No notification at this level.'
			)
			putCommentRecords(editor, [
				createComment({ threadId: thread.id, pageId: thread.pageId, authorId: 'ada', body }),
			])
		}
		if (alsoWhenFocused.get()) return post()

		let secondsLeft = 5
		const tick = () => {
			if (secondsLeft === 0) return post()
			status.set(`Ada posts in ${secondsLeft}s. Switch to another app now.`)
			secondsLeft--
			editor.timers.setTimeout(tick, 1000)
		}
		tick()
	}

	return (
		<div className="tlui-menu comment-notifications">
			<div className="comment-notifications__header">
				<span className="comment-notifications__title">Inbox</span>
				{unreadCount > 0 && <span className="comment-notifications__badge">{unreadCount}</span>}
				<TldrawUiButton
					type="normal"
					disabled={unreadCount === 0}
					onClick={() => onCommentsRead(notifications.map((n) => n.comment.record.id))}
				>
					<TldrawUiButtonLabel>Mark all read</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>

			{notifications.length === 0 ? (
				<p className="comment-notifications__empty">
					Nothing here yet. Comments that mention you, reply in one of your threads, or react to
					your comments land in this list.
				</p>
			) : (
				<ul className="comment-notifications__list">
					{notifications.map(({ comment: { record: comment }, primaryReason, unread }) => (
						<li key={comment.id}>
							<button
								className="comment-notifications__row"
								data-unread={unread}
								// [6]
								onClick={() => revealThread(editor, comment.id)}
							>
								<Avatar author={resolveAuthor(comment.authorId)} />
								<span className="comment-notifications__body">
									<span className="comment-notifications__meta">
										<b>{resolveAuthor(comment.authorId).name}</b> {REASON_LABEL[primaryReason]} ·{' '}
										{formatRelativeTime(new Date(comment.createdAt).toISOString())}
									</span>
									<span className="comment-notifications__preview">
										{richTextToPlaintext(comment.body, resolveName)}
									</span>
								</span>
								{unread && <span className="comment-notifications__dot" />}
							</button>
						</li>
					))}
				</ul>
			)}

			{typeof Notification !== 'undefined' && (
				<div className="comment-notifications__section">
					<div className="comment-notifications__section-title">1. Desktop notifications</div>
					<div className="comment-notifications__row-controls">
						<select
							value={level}
							onChange={(e) => setDesktopLevel(e.currentTarget.value as DesktopLevel)}
						>
							<option value="off">Off</option>
							<option value="all">All activity</option>
							<option value="mentions-and-replies">Mentions and replies</option>
							<option value="mentions">Mentions only</option>
						</select>
						<TldrawUiButton type="normal" onClick={sendTestNotification}>
							<TldrawUiButtonLabel>Test</TldrawUiButtonLabel>
						</TldrawUiButton>
					</div>
					<label className="comment-notifications__check">
						<input
							type="checkbox"
							checked={whenFocused}
							onChange={(e) => alsoWhenFocused.set(e.currentTarget.checked)}
						/>
						Also while this tab is focused
					</label>
					<p className="comment-notifications__hint">
						A real app only notifies when you’re elsewhere. Nothing showing? On macOS, allow both
						Google Chrome entries in System Settings → Notifications, and turn off Focus.
					</p>
				</div>
			)}

			<div className="comment-notifications__section">
				<div className="comment-notifications__section-title">2. Pretend to be Ada</div>
				<div className="comment-notifications__row-controls">
					<TldrawUiButton
						type="normal"
						disabled={!replyTarget}
						onClick={() =>
							postAsAda(
								toRichText('One more thought on this — the spacing feels tight.'),
								replyTarget
							)
						}
					>
						<TldrawUiButtonLabel>Ada replies</TldrawUiButtonLabel>
					</TldrawUiButton>
					<TldrawUiButton
						type="normal"
						disabled={!mentionTarget}
						onClick={() => postAsAda(bodyMentioning('', ME, ' thoughts?'), mentionTarget)}
					>
						<TldrawUiButtonLabel>Ada mentions you</TldrawUiButtonLabel>
					</TldrawUiButton>
				</div>
				{statusText && <p className="comment-notifications__status">{statusText}</p>}
			</div>
		</div>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => (
		<CanvasComments
			currentUserId={ME}
			resolveAuthor={resolveAuthor}
			getMentionSuggestions={(query) => filterMentionMembers(MEMBERS, query)}
			isCommentUnread={isCommentUnread}
			onCommentsRead={onCommentsRead}
			onPostComment={onPostComment}
		/>
	),
}

export default function CommentNotificationsExample() {
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				onMount={handleMount}
				tools={commentTools}
				overrides={[commentToolOverrides]}
				components={components}
			>
				<NotificationsPanel />
			</Tldraw>
		</div>
	)
}

/*
[1]
Read receipts are the host's data, not the SDK's. A comment record says who wrote it and when; who
has *seen* it is one row per (comment, reader), which a real app keeps in its own database so the
count survives a reload and follows you between devices.

Here that store is a local atom, so the whole flow runs in memory. An atom rather than React state
because the two callbacks below are handed to `CanvasComments` once: keeping them stable avoids
re-creating the comments layer every time something is read, and `useValue` gives the panel its
reactive read of the same set.

[2]
`getStoreCommentNotifications` reads the comment records and tags each one that concerns you with
why: it mentions you, it replies in a thread you started or joined, it's on a board you own (pass
`ownsBoard`), or it's a reaction to your own comment. Passing the same `isCommentUnread` that
`CanvasComments` takes marks each entry read or unread. It reads signals, so it's reactive wherever
it's read inside one: `useValue` here, a `react` inside the notifier.

These reasons only see the board that's open. A hosted app that wants a feed across every board
resolves them server-side over its own rows, with the same rules: `categorizeCommentNotifications`
takes any rows shaped like a comment joined with its thread and reactions.

[3]
`startCommentNotifier` turns the same feed into operating-system notifications. It only shows what's
newer than when it started and arrives while the window is out of focus, shows each entry once, and
among several open tabs lets only one notify. `shouldShow` narrows it: `isAtNotificationLevel` maps
"mentions only" or "mentions and replies" onto the reasons. Clicking a notification calls `onClick`,
which here reveals the thread.

`isWindowFocused` decides what counts as the user looking at the app; the default checks the
document. The example's checkbox overrides it so you can watch notifications arrive without leaving
the page, and its `show` wraps the default to report what was sent. The level lives in an atom for
the example; a real app would keep it with the user's preferences.

A page can't tell when the operating system hides its notifications: the browser reports
permission as granted and the notification as shown either way. That's why a "Test" button next to
the setting, with a note on where the system switch lives, is worth having in a real app too.

[4]
The feed is derived, not stored: nothing needs to be written when a comment arrives.

Read comments stay in the list — the unread dot and the header badge are what clear. Filtering the
list down to unread only would make the feed lose its history the moment you read it.

[5]
Comments are ordinary records, so "someone else commented" is just a write. This stands in for the
sync connection a real app would have; opening this example in two tabs against a synced store
would show the same thing arriving on its own. With "Also while this tab is focused" off, Ada waits
five seconds so you can switch to another app first.

[6]
`revealThread` is the jump-to-thread entry point for anything outside the canvas — this feed, a
deep link, an email. It's forgiving about timing: `CanvasComments` waits for the records to sync
in, switches pages, unhides pins, and zooms far enough to split the thread out of any cluster
before opening it. It takes a thread id or, as here, the id of any comment in it.

Opening the thread is also what marks it read: the thread view reports every unread comment it
displays through `onCommentsRead`, batched per report, including replies that arrive while it stays
open.
*/
