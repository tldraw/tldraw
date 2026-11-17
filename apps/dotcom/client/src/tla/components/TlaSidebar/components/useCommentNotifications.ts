import { richTextToPlaintext } from '@tldraw/commenting'
import { useMemo } from 'react'
import { Computed, computed, defineMessages, TLRichText, useTranslation, useValue } from 'tldraw'
import { TldrawApp } from '../../../app/TldrawApp'
import { useMaybeApp } from '../../../hooks/useAppState'
import {
	buildReactionNotifications,
	categorizeCommentNotifications,
	CommentNotification,
	ForeignReactors,
	mergeNotifications,
	summarizeForeignReactors,
} from './commentNotifications'

const messages = defineMessages({
	unknownAuthor: { defaultMessage: 'Someone' },
})

function deriveNotifications(app: TldrawApp | null) {
	const comments = categorizeCommentNotifications(app?.getComments() ?? [], app?.userId)
	const reactionEntries = buildReactionNotifications(app?.getReactions() ?? [], app?.userId)
	const notifications = mergeNotifications(comments, reactionEntries)
	const unreadCount = notifications.filter((n) => n.unread).length
	return { notifications, unreadCount }
}

type CommentNotifications = ReturnType<typeof deriveNotifications>

const EMPTY = deriveNotifications(null)

// One computed per app, so the trigger button and the open panel share a single derivation pass
// over every comment and reaction instead of each running it on every change.
const notificationsByApp = new WeakMap<TldrawApp, Computed<CommentNotifications>>()

function getNotifications$(app: TldrawApp) {
	let notifications$ = notificationsByApp.get(app)
	if (!notifications$) {
		notifications$ = computed('comment notifications', () => deriveNotifications(app))
		notificationsByApp.set(app, notifications$)
	}
	return notifications$
}

/**
 * Comments and reactions surfaced as notifications, merged from the comment feeds and the
 * `reactions` synced query and sorted by timestamp. {@link categorizeCommentNotifications} and
 * {@link buildReactionNotifications} do the per-feed shaping. Kept free of per-row display work: the
 * always-mounted badge reruns this on every Zero update.
 */
export function useCommentNotifications(): CommentNotifications {
	const app = useMaybeApp()
	return useValue('comment notifications', () => (app ? getNotifications$(app).get() : EMPTY), [
		app,
	])
}

/** A notification plus the display fields every consumer needs. */
export interface EnrichedCommentNotification extends CommentNotification {
	/** The comment's author; "Someone" when unresolvable. For a reaction entry that's the user. */
	authorName: string
	preview: string
	/** Who reacted; set on `reaction` entries only. */
	reactors?: ForeignReactors
}

/** Adds display fields to the rows actually rendered; `rows` must be memoized by the caller. */
export function useEnrichedNotifications(
	rows: CommentNotification[]
): EnrichedCommentNotification[] {
	const app = useMaybeApp()
	const msg = useTranslation()
	const unknownAuthorLbl = msg(messages.unknownAuthor)
	const userId = app?.userId
	return useMemo(
		() =>
			rows.map((n) => ({
				...n,
				// never the raw id: an opaque uuid as a byline reads as a bug
				authorName: n.comment.authorName || unknownAuthorLbl,
				preview: richTextToPlaintext(n.comment.body as TLRichText),
				reactors:
					n.primaryReason === 'reaction'
						? summarizeForeignReactors(n.comment.reactions, userId)
						: undefined,
			})),
		[rows, unknownAuthorLbl, userId]
	)
}
