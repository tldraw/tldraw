import {
	Avatar,
	CanvasComments,
	CommentAuthor,
	CommentNotificationLevel,
	CommentNotificationReason,
	commentToolOverrides,
	commentTools,
	deliverBrowserNotification,
	filterMentionMembers,
	formatRelativeTime,
	getStoreCommentNotifications,
	MentionMember,
	putCommentRecords,
	revealThread,
	richTextToPlaintext,
	useCommentThreads,
} from '@tldraw/commenting'
import { useMemo } from 'react'
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
	TLCommentThreadId,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TLRichText,
	toRichText,
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

// [2]
const mutedThreads = atom<ReadonlySet<TLCommentThreadId>>('muted threads', new Set())

const isThreadMuted = (threadId: TLCommentThreadId) => mutedThreads.get().has(threadId)

const onThreadMutedChange = (threadId: TLCommentThreadId, muted: boolean) =>
	mutedThreads.update((prev) => {
		const next = new Set(prev)
		if (muted) next.add(threadId)
		else next.delete(threadId)
		return next
	})

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

// [3]
const getNotifications = (editor: Editor) =>
	getStoreCommentNotifications(editor, ME, { isCommentUnread, isThreadMuted })

// [4]
const desktopLevel = atom<CommentNotificationLevel>('desktop notification level', 'off')
const alsoWhenFocused = atom('also notify when focused', true)
const status = atom<string | null>('status', null)

async function setDesktopLevel(level: CommentNotificationLevel) {
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
	// [5]
	const notifications = useValue('notifications', () => getNotifications(editor), [editor])
	const level = useValue(desktopLevel)
	const whenFocused = useValue(alsoWhenFocused)
	const statusText = useValue(status)

	const unreadCount = notifications.filter((n) => n.unread).length

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

	// [6]
	const postAsAda = (body: TLRichText, thread: TLCommentThread | undefined) => {
		if (!thread) return
		const post = () => {
			// set before the write: a notification it triggers replaces this with what was sent
			status.set(
				desktopLevel.get() === 'off'
					? 'Ada posted. Pick a level above to get a desktop notification too.'
					: 'Ada posted. No notification: check the level, or whether the thread is muted.'
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
					{notifications.map(
						({ comment: { record: comment, reactions }, primaryReason, timestamp, unread }) => {
							// a reaction entry is about who reacted, and when, not the (your own) comment's author
							const actorId =
								primaryReason === 'reaction'
									? ([...(reactions ?? [])]
											.filter((r) => r.userId !== ME)
											.sort((a, b) => b.createdAt - a.createdAt)[0]?.userId ?? comment.authorId)
									: comment.authorId
							return (
								<li key={comment.id}>
									<button
										className="comment-notifications__row"
										data-unread={unread}
										// [7]
										onClick={() => revealThread(editor, comment.id)}
									>
										<Avatar author={resolveAuthor(actorId)} />
										<span className="comment-notifications__body">
											<span className="comment-notifications__meta">
												<b>{resolveAuthor(actorId).name}</b> {REASON_LABEL[primaryReason]} ·{' '}
												{formatRelativeTime(new Date(timestamp).toISOString())}
											</span>
											<span className="comment-notifications__preview">
												{richTextToPlaintext(comment.body, resolveName)}
											</span>
										</span>
										{unread && <span className="comment-notifications__dot" />}
									</button>
								</li>
							)
						}
					)}
				</ul>
			)}

			{typeof Notification !== 'undefined' && (
				<div className="comment-notifications__section">
					<div className="comment-notifications__section-title">1. Desktop notifications</div>
					<div className="comment-notifications__row-controls">
						<select
							value={level}
							onChange={(e) => setDesktopLevel(e.currentTarget.value as CommentNotificationLevel)}
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
				<p className="comment-notifications__hint">
					To mute a thread, open it and choose Mute thread from its ⋯ menu. Only mentions get
					through a muted thread.
				</p>
				{statusText && <p className="comment-notifications__status">{statusText}</p>}
			</div>
		</div>
	)
}

function Comments() {
	const level = useValue(desktopLevel)
	return (
		<CanvasComments
			currentUserId={ME}
			resolveAuthor={resolveAuthor}
			getMentionSuggestions={(query) => filterMentionMembers(MEMBERS, query)}
			isCommentUnread={isCommentUnread}
			onCommentsRead={onCommentsRead}
			onPostComment={onPostComment}
			isThreadMuted={isThreadMuted}
			onThreadMutedChange={onThreadMutedChange}
			// [8]
			desktopNotifications={{
				level,
				isWindowFocused: () =>
					!alsoWhenFocused.get() && document.visibilityState === 'visible' && document.hasFocus(),
				deliver: (message, open) => {
					deliverBrowserNotification(message, open)
					status.set(`Notification sent: “${message.title}”. Click it to open the thread.`)
				},
			}}
		/>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: Comments,
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
because the callbacks are handed to `CanvasComments` once: keeping them stable avoids re-creating
the comments layer every time something is read, and `useValue` gives the panel its reactive read of
the same set.

[2]
Mutes are the host's data too, kept the same way. Passing `onThreadMutedChange` adds Mute thread and
Unmute thread to a thread's menu; `isThreadMuted` tells the notifications which threads to drop. A
muted thread still lets mentions through: someone asking for you by name should reach you.

[3]
`getStoreCommentNotifications` reads the comment records and tags each one that concerns you with
why: it mentions you, it replies in a thread you started or joined, it's on a board you own (pass
`ownsBoard`), or it's a reaction to your own comment. It takes the same `isCommentUnread` and
`isThreadMuted` as `CanvasComments`, and reads signals, so `useValue` keeps the inbox current.

These reasons only see the board that's open. A feed across every board is the host's to build from
its own data.

[4]
Browsers only show notifications once the user allows them, and only ask in response to a click, so
the app asks when the user picks a level. The level is a plain string — off, all,
mentions-and-replies, or mentions — so a real app can keep it with the user's preferences. A page
can't tell when the operating system hides its notifications: the browser reports permission as
granted and the notification as shown either way. That's what the Test button is for.

[5]
The feed is derived, not stored: nothing needs to be written when a comment arrives. Read comments
stay in the list — the unread dot and the header badge are what clear.

[6]
Comments are ordinary records, so "someone else commented" is just a write. This stands in for the
sync connection a real app would have. With "Also while this tab is focused" off, Ada waits five
seconds so you can switch to another app first.

[7]
`revealThread` is the jump-to-thread entry point for anything outside the canvas — this feed, a
deep link, a notification. It takes a thread id or, as here, the id of any comment in it, and opening
the thread is also what marks it read.

[8]
`desktopNotifications` turns the same feed into system notifications while you're looking
elsewhere. Each one fires once, and clicking it opens its thread. `level` is all most apps pass. The
example also overrides `isWindowFocused`, so its checkbox can show notifications while you watch, and
wraps `deliver` to report what was sent. A desktop app would use `deliver` to hand the message, plain
data, to its main process.
*/
