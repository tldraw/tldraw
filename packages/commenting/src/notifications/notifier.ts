import { atom, react, uniqueId } from 'tldraw'
import {
	CommentNotification,
	CommentNotificationInput,
	CommentNotificationLevel,
	isAtNotificationLevel,
} from './comment-notifications'

/**
 * What a notification says and where it leads, as plain data: the same message can go to the
 * browser's Notification API, a desktop app's main process, or a push payload, none of which can
 * carry a callback.
 * @public
 */
export interface CommentNotificationMessage {
	/** Notifications with the same tag replace each other instead of stacking. */
	tag: string
	title: string
	body: string
	commentId: string
	threadId: string
	/** Where opening the notification leads, when the host has a URL for it. */
	url?: string
}

/** @internal */
export interface CommentNotifierOptions<T extends CommentNotificationInput> {
	/** The notifications to watch, unfiltered by the user's preferences: the notifier applies the
	 *  level and mutes itself, so what they hold back stays seen when they loosen. Read inside a
	 *  `react`, so it should read signals. */
	getNotifications(): readonly CommentNotification<T>[]
	/** The user's level. Reactive, like `getNotifications`. */
	getLevel(): CommentNotificationLevel
	/** The user's muted threads, which only let mentions through. Reactive. */
	isThreadMuted?(threadId: string): boolean
	format(notification: CommentNotification<T>): CommentNotificationMessage
	/** Called when the user opens a notification. */
	onOpen(message: CommentNotificationMessage): void
	/** Defaults to {@link deliverBrowserNotification}. A desktop app passes the message to its main
	 *  process instead, and calls `onOpen` itself when it's clicked. */
	deliver?(message: CommentNotificationMessage, open: () => void): void
	/** Whether the user is looking at the app. Defaults to any tab sharing `lockName` being visible
	 *  and focused; a desktop app asks its window instead. */
	isWindowFocused?(): boolean
	/** Tabs sharing a lock name elect one of them to notify. */
	lockName?: string
}

/**
 * Shows a notification for each new unread entry at the user's level while they aren't looking at
 * the app, and returns a function that stops it.
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
	const lockName = opts.lockName ?? 'tldraw-comment-notifier'
	const deliver = opts.deliver ?? deliverBrowserNotification
	const focus = opts.isWindowFocused ? undefined : watchFocusAcrossTabs(lockName)
	const isFocused = opts.isWindowFocused ?? focus!.isFocused
	const shown = new Set<string>()
	let since = Date.now()
	let wasEnabled = false
	let disposed = false

	const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
	const isLeader = atom('comment notifier leader', !locks)
	let releaseLock: (() => void) | undefined
	locks
		?.request(lockName, () => {
			if (disposed) return
			since = Date.now()
			isLeader.set(true)
			return new Promise<void>((resolve) => (releaseLock = resolve))
		})
		.catch(() => isLeader.set(true))

	const stop = react('comment notifier', () => {
		const level = opts.getLevel()
		const enabled = level !== 'off' && isLeader.get()
		// what arrived while off isn't new when switched back on
		if (enabled && !wasEnabled) since = Date.now()
		wasEnabled = enabled
		if (!enabled) return

		for (const n of opts.getNotifications()) {
			if (!n.unread || n.timestamp <= since) continue
			const key = `${n.comment.id}:${n.timestamp}`
			if (shown.has(key)) continue
			// counted as seen even when skipped, so focusing the app, loosening the level or unmuting
			// later doesn't replay it
			shown.add(key)
			if (isFocused() || !isAtNotificationLevel(n, level)) continue
			if (opts.isThreadMuted?.(n.comment.threadId) && !n.reasons.includes('mention')) continue
			const message = opts.format(n)
			deliver(message, () => opts.onOpen(message))
		}
	})

	return () => {
		if (disposed) return
		disposed = true
		stop()
		releaseLock?.()
		focus?.dispose()
	}
}

/**
 * Whether the user is looking at any tab on `channelName`. Only one tab notifies, and without this
 * a background tab would notify while the user works in another.
 */
function watchFocusAcrossTabs(channelName: string) {
	if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
		return { isFocused: isDocumentFocused, dispose() {} }
	}
	const tabId = uniqueId()
	const focusedTabs = new Set<string>()
	const channel = new BroadcastChannel(channelName)
	const report = (focused = isDocumentFocused()) => channel.postMessage({ tabId, focused })
	channel.onmessage = ({ data }) => {
		if (data === 'report') return report()
		if (data.focused) focusedTabs.add(data.tabId)
		else focusedTabs.delete(data.tabId)
	}
	const onFocus = () => report(true)
	const onBlur = () => report(false)
	const onVisibility = () => report()
	window.addEventListener('focus', onFocus)
	window.addEventListener('blur', onBlur)
	window.addEventListener('pagehide', onBlur)
	document.addEventListener('visibilitychange', onVisibility)
	// a tab that joins late asks the others where the user is
	channel.postMessage('report')
	report()
	return {
		isFocused: () => isDocumentFocused() || focusedTabs.size > 0,
		dispose() {
			report(false)
			window.removeEventListener('focus', onFocus)
			window.removeEventListener('blur', onBlur)
			window.removeEventListener('pagehide', onBlur)
			document.removeEventListener('visibilitychange', onVisibility)
			channel.close()
		},
	}
}

/** Whether this tab is visible and focused. @internal */
export function isDocumentFocused() {
	return (
		typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()
	)
}

/**
 * Shows a message through the web Notification API, replacing any earlier one with the same tag.
 * Does nothing without notification permission, which the host asks for from a user gesture.
 * @public
 */
export function deliverBrowserNotification(message: CommentNotificationMessage, open: () => void) {
	if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
	const n = new Notification(message.title, { body: message.body, tag: message.tag })
	n.onclick = () => {
		window.focus()
		n.close()
		open()
	}
}
