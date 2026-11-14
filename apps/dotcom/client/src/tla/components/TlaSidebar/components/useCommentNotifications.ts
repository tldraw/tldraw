import { useValue } from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'
import {
	buildReactionNotifications,
	categorizeCommentNotifications,
	mergeNotifications,
} from './commentNotifications'

/**
 * Comments and reactions surfaced as notifications, merged from the comment feeds and the
 * `reactions` synced query and sorted by timestamp. {@link categorizeCommentNotifications} and
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
