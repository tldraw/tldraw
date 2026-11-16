import { Computed, computed, useValue } from 'tldraw'
import { TldrawApp } from '../../../app/TldrawApp'
import { useMaybeApp } from '../../../hooks/useAppState'
import {
	buildReactionNotifications,
	categorizeCommentNotifications,
	mergeNotifications,
} from './commentNotifications'

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
 * {@link buildReactionNotifications} do the per-feed shaping.
 */
export function useCommentNotifications(): CommentNotifications {
	const app = useMaybeApp()
	return useValue('comment notifications', () => (app ? getNotifications$(app).get() : EMPTY), [
		app,
	])
}
