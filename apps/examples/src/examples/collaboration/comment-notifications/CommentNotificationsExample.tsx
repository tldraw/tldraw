import {
	Avatar,
	CanvasComments,
	CommentAuthor,
	commentToolOverrides,
	commentTools,
	filterMentionMembers,
	formatRelativeTime,
	MentionMember,
	putCommentRecords,
	revealThread,
	richTextToPlaintext,
	useComments,
	useCommentThreads,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
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
function mentionedIds(body: TLRichText): string[] {
	const ids: string[] = []
	const visit = (node: any) => {
		if (!node || typeof node !== 'object') return
		if (node.type === 'mention' && typeof node.attrs?.id === 'string') ids.push(node.attrs.id)
		if (Array.isArray(node.content)) node.content.forEach(visit)
	}
	visit(body)
	return ids
}

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

// [3]
type NotificationReason = 'mention' | 'reply'

interface Notification {
	comment: TLComment
	reason: NotificationReason
	unread: boolean
}

const REASON_LABEL: Record<NotificationReason, string> = {
	mention: 'mentioned you',
	reply: 'replied in your thread',
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
	const comments = useComments(editor)
	const threads = useCommentThreads(editor)
	const read = useValue(readComments)

	// The threads you're a part of: ones you started, plus any you've commented in.
	const yourThreadIds = useMemo(() => {
		const ids = new Set<TLCommentThreadId>(
			threads.filter((thread) => thread.createdBy === ME).map((thread) => thread.id)
		)
		for (const comment of comments) {
			if (comment.authorId === ME) ids.add(comment.threadId)
		}
		return ids
	}, [threads, comments])

	// [4]
	const notifications = useMemo(() => {
		const result: Notification[] = []
		for (const comment of comments) {
			// A notification is always about someone else's comment, never your own.
			if (comment.authorId === ME) continue
			const reason: NotificationReason | null = mentionedIds(comment.body).includes(ME)
				? 'mention'
				: yourThreadIds.has(comment.threadId)
					? 'reply'
					: null
			if (!reason) continue
			result.push({ comment, reason, unread: !read.has(comment.id) })
		}
		return result.sort((a, b) => b.comment.createdAt - a.comment.createdAt)
	}, [comments, yourThreadIds, read])

	const unreadCount = notifications.filter((n) => n.unread).length

	// The newest thread of yours that Ada could reply into.
	const replyTarget = useMemo(
		() =>
			threads
				.filter((thread) => yourThreadIds.has(thread.id))
				.sort((a, b) => b.createdAt - a.createdAt)[0],
		[threads, yourThreadIds]
	)
	const mentionTarget = useMemo(
		() => [...threads].sort((a, b) => b.createdAt - a.createdAt)[0],
		[threads]
	)

	// [5]
	const postAsAda = (body: TLRichText, thread: TLCommentThread | undefined) => {
		if (!thread) return
		putCommentRecords(editor, [
			createComment({ threadId: thread.id, pageId: thread.pageId, authorId: 'ada', body }),
		])
	}

	return (
		<div className="tlui-menu comment-notifications">
			<div className="comment-notifications__header">
				<span className="comment-notifications__title">Inbox</span>
				{unreadCount > 0 && <span className="comment-notifications__badge">{unreadCount}</span>}
				<TldrawUiButton
					type="normal"
					disabled={unreadCount === 0}
					onClick={() => readComments.set(new Set(comments.map((c) => c.id)))}
				>
					<TldrawUiButtonLabel>Mark all read</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>

			{notifications.length === 0 ? (
				<p className="comment-notifications__empty">
					Nothing here yet. Comments that mention you, or that reply in one of your threads, land in
					this list.
				</p>
			) : (
				<ul className="comment-notifications__list">
					{notifications.map(({ comment, reason, unread }) => (
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
										<b>{resolveAuthor(comment.authorId).name}</b> {REASON_LABEL[reason]} ·{' '}
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

			<div className="comment-notifications__actions">
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
				// Commenting is a licensed feature. Every feature is enabled in local development, but a
				// deployed app needs a license key that includes commenting — swap in your own key here.
				licenseKey={getLicenseKey()}
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
An `@`-mention is a `{ type: 'mention', attrs: { id } }` node inside the comment's rich-text body,
where `attrs.id` is the member id the composer's picker chose. Walking the body for those ids is
how "this comment mentions me" is decided — the notification reason with the strongest claim on
someone's attention.

[3]
Why a comment is worth telling someone about is a product decision, so the SDK doesn't make it.
This example uses the two reasons that need no server: the comment mentions you, or it lands in a
thread you're part of. A hosted app usually adds more — activity on a board you own, say — and
resolves them server-side so the feed spans every board rather than the one that's open.

[4]
The feed is derived, not stored: `useComments` and `useCommentThreads` give the comment records
reactively, and each one is tagged with a reason and checked against the read set. Nothing needs to
be written when a comment arrives.

Read comments stay in the list — the unread dot and the header badge are what clear. Filtering the
list down to unread only would make the feed lose its history the moment you read it.

[5]
Comments are ordinary records, so "someone else commented" is just a write. This stands in for the
sync connection a real app would have; opening this example in two tabs against a synced store
would show the same thing arriving on its own.

[6]
`revealThread` is the jump-to-thread entry point for anything outside the canvas — this feed, a
deep link, an email. It's forgiving about timing: `CanvasComments` waits for the records to sync
in, switches pages, unhides pins, and zooms far enough to split the thread out of any cluster
before opening it. It takes a thread id or, as here, the id of any comment in it.

Opening the thread is also what marks it read: the thread view reports every unread comment it
displays through `onCommentsRead`, batched per report, including replies that arrive while it stays
open.
*/
