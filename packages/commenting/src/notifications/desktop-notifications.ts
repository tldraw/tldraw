import { useEffect, useRef, useState } from 'react'
import { atom, defineMessages, Editor, TLCommentThreadId, uniqueId, useTranslation } from 'tldraw'
import { type CommentingContext } from '../canvas/context'
import { richTextToPlaintext } from '../canvas/rich-text'
import { revealThread } from '../canvas/state'
import { CommentNotification, CommentNotificationLevel } from './comment-notifications'
import {
	CommentNotificationMessage,
	deliverBrowserNotification,
	isDocumentFocused,
	startCommentNotifier,
} from './notifier'
import { getStoreCommentNotifications, StoreCommentNotificationInput } from './store-notifications'

/** @public */
export interface DesktopCommentNotificationsOptions {
	/** How much reaches the user as desktop notifications. Ask for permission (from a click) before
	 *  turning it on: without it nothing shows. */
	level: CommentNotificationLevel
	/** Defaults to {@link deliverBrowserNotification}. A desktop app passes the message to its main
	 *  process, and calls `open` when the user clicks it. */
	deliver?(message: CommentNotificationMessage, open: () => void): void
	/** Whether the user is looking at the app, which skips the notification. Defaults to this tab
	 *  being visible and focused; a desktop app asks its window instead. */
	isWindowFocused?(): boolean
}

const messages = defineMessages({
	mention: { id: 'comments.notification.mention', defaultMessage: '{name} mentioned you' },
	reply: { id: 'comments.notification.reply', defaultMessage: '{name} replied' },
	'owned-board': {
		id: 'comments.notification.owned-board',
		defaultMessage: '{name} commented on your board',
	},
	reaction: {
		id: 'comments.notification.reaction',
		defaultMessage: '{name} reacted to your comment',
	},
	unknownAuthor: { id: 'comments.unknown-author', defaultMessage: 'Someone' },
})

/**
 * Desktop notifications for the open board's comments, as `CanvasComments` runs them.
 *
 * Each mount notifies on its own rather than electing one tab: it only sees its own board, so a tab
 * on another board holding a shared lock would silence this one. When one board is open in two
 * tabs, the shared `tag` makes the system collapse the duplicate.
 */
export function useDesktopCommentNotifications(
	editor: Editor,
	context: CommentingContext,
	options: DesktopCommentNotificationsOptions | undefined
) {
	const msg = useTranslation()
	const latest = useRef({ context, options, msg })
	latest.current = { context, options, msg }

	const [level] = useState(() => atom<CommentNotificationLevel>('notification level', 'off'))
	const wanted = options?.level ?? 'off'
	useEffect(() => {
		level.set(wanted)
	}, [level, wanted])

	const userId = context.currentUserId
	useEffect(
		() =>
			startCommentNotifier<StoreCommentNotificationInput>({
				getNotifications: () =>
					getStoreCommentNotifications(editor, userId, {
						isCommentUnread: latest.current.context.isCommentUnread,
					}),
				getLevel: () => level.get(),
				isThreadMuted: (threadId) =>
					latest.current.context.isThreadMuted?.(threadId as TLCommentThreadId) ?? false,
				format: (n) => formatMessage(n, latest.current.context, latest.current.msg),
				onOpen: (message) => revealThread(editor, message.commentId),
				deliver: (message, open) =>
					(latest.current.options?.deliver ?? deliverBrowserNotification)(message, open),
				isWindowFocused: () => latest.current.options?.isWindowFocused?.() ?? isDocumentFocused(),
				lockName: `tldraw-comment-notifier:${uniqueId()}`,
			}),
		[editor, level, userId]
	)
}

function formatMessage(
	n: CommentNotification<StoreCommentNotificationInput>,
	context: CommentingContext,
	msg: ReturnType<typeof useTranslation>
): CommentNotificationMessage {
	const comment = n.comment.record
	const nameOf = (id: string) => context.resolveAuthor(id)?.name
	// a reaction entry is about who reacted, not the user's own comment
	const actorId =
		n.primaryReason === 'reaction'
			? (newestReactor(n.comment.reactions, context.currentUserId) ?? comment.authorId)
			: comment.authorId
	return {
		tag: comment.id,
		title: msg(messages[n.primaryReason], {
			name: nameOf(actorId) ?? msg(messages.unknownAuthor),
		}),
		body: richTextToPlaintext(comment.body, nameOf),
		commentId: comment.id,
		threadId: comment.threadId,
		url: context.getThreadHref?.(comment.threadId),
	}
}

function newestReactor(
	reactions: StoreCommentNotificationInput['reactions'],
	userId: string | null
): string | undefined {
	let newest: { userId: string; createdAt: number } | undefined
	for (const r of reactions ?? []) {
		if (r.userId !== userId && (!newest || r.createdAt > newest.createdAt)) newest = r
	}
	return newest?.userId
}
