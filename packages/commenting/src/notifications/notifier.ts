import { atom, react } from 'tldraw'
import { CommentNotification, CommentNotificationInput } from './comment-notifications'

/** What a notification says. @internal */
export interface CommentNotificationContent {
	title: string
	body: string
}

/** Puts a notification in front of the user, and calls `onClick` when they open it. @internal */
export type ShowCommentNotification<T extends CommentNotificationInput> = (
	notification: CommentNotification<T>,
	content: CommentNotificationContent,
	onClick: () => void
) => void

/** @internal */
export interface CommentNotifierOptions<T extends CommentNotificationInput> {
	/** The notifications to watch. Read inside a `react`, so it should read signals. */
	getNotifications(): readonly CommentNotification<T>[]
	/** Whether the user has opted in. Reactive, like `getNotifications`. */
	isEnabled(): boolean
	/** Whether this entry is worth a notification, e.g. `isAtNotificationLevel`. Reactive.
	 *  An entry it rejects counts as seen, so loosening the filter later doesn't replay it. */
	shouldShow?(notification: CommentNotification<T>): boolean
	format(notification: CommentNotification<T>): CommentNotificationContent
	onClick(notification: CommentNotification<T>): void
	/** Defaults to {@link showBrowserNotification}. */
	show?: ShowCommentNotification<T>
	/** Tabs sharing a lock name elect one of them to notify. */
	lockName?: string
	/** Whether the user is looking at the app, which skips the notification. Defaults to the
	 *  document being visible and focused; an Electron host can ask its window instead. */
	isWindowFocused?(): boolean
}

/**
 * Shows a notification for each new unread entry while the window is out of focus, and returns a
 * function that stops it.
 *
 * "New" means newer than when this tab started notifying: everything already in the feed when it
 * starts (including a backlog that syncs in late) is history the user can read in the app. Among
 * tabs on one origin only the one holding `lockName` notifies, so N open tabs don't fire N times;
 * when it closes, the next tab takes over from that moment.
 * @internal
 */
export function startCommentNotifier<T extends CommentNotificationInput>(
	opts: CommentNotifierOptions<T>
): () => void {
	const show = opts.show ?? showBrowserNotification
	const isFocused = opts.isWindowFocused ?? isDocumentFocused
	const shown = new Set<string>()
	let since = Date.now()
	let wasEnabled = false
	let disposed = false

	const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
	const isLeader = atom('comment notifier leader', !locks)
	let releaseLock: (() => void) | undefined
	locks
		?.request(opts.lockName ?? 'tldraw-comment-notifier', () => {
			if (disposed) return
			since = Date.now()
			isLeader.set(true)
			return new Promise<void>((resolve) => (releaseLock = resolve))
		})
		.catch(() => isLeader.set(true))

	const stop = react('comment notifier', () => {
		const enabled = opts.isEnabled() && isLeader.get()
		// what arrived while off isn't new when switched back on
		if (enabled && !wasEnabled) since = Date.now()
		wasEnabled = enabled
		if (!enabled) return

		for (const n of opts.getNotifications()) {
			if (!n.unread || n.timestamp <= since) continue
			const key = `${n.comment.id}:${n.timestamp}`
			if (shown.has(key)) continue
			shown.add(key)
			// the app's own unread badge already covers a window the user is looking at
			if (isFocused()) continue
			if (opts.shouldShow && !opts.shouldShow(n)) continue
			show(n, opts.format(n), () => opts.onClick(n))
		}
	})

	return () => {
		disposed = true
		stop()
		releaseLock?.()
	}
}

function isDocumentFocused() {
	return (
		typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()
	)
}

/**
 * Shows a notification through the web Notification API, replacing any earlier one for the same
 * comment. Does nothing without notification permission.
 * @internal
 */
export function showBrowserNotification<T extends CommentNotificationInput>(
	notification: CommentNotification<T>,
	content: CommentNotificationContent,
	onClick: () => void
) {
	if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
	const n = new Notification(content.title, { body: content.body, tag: notification.comment.id })
	n.onclick = () => {
		window.focus()
		n.close()
		onClick()
	}
}
