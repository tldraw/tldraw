import { atom } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	CommentNotification,
	CommentNotificationLevel,
	CommentNotificationReason,
	isAtNotificationLevel,
} from './comment-notifications'
import { CommentNotificationMessage, startCommentNotifier } from './notifier'

function entry(
	id: string,
	timestamp: number,
	unread = true,
	reasons: CommentNotificationReason[] = ['reply']
): CommentNotification {
	return {
		comment: { id, authorId: 'other', threadId: 't', createdAt: timestamp, body: null },
		reasons,
		primaryReason: reasons[0],
		timestamp,
		unread,
	}
}

describe('startCommentNotifier', () => {
	let focused = false
	const stops: (() => void)[] = []
	beforeEach(() => {
		vi.useFakeTimers({ now: 1000 })
		focused = false
		vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
	})
	afterEach(() => {
		stops.splice(0).forEach((stop) => stop())
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	function setup(
		initial: CommentNotification[] = [],
		initialLevel: CommentNotificationLevel = 'all'
	) {
		const feed = atom('feed', initial)
		const level = atom('level', initialLevel)
		const deliver = vi.fn<(message: CommentNotificationMessage, open: () => void) => void>()
		const onOpen = vi.fn()
		const stop = startCommentNotifier({
			getNotifications: () => feed.get(),
			getLevel: () => level.get(),
			format: (n) => ({
				tag: n.comment.id,
				title: n.comment.id,
				body: '',
				commentId: n.comment.id,
				threadId: n.comment.threadId,
			}),
			onOpen,
			deliver,
		})
		stops.push(stop)
		const shownIds = () => deliver.mock.calls.map(([message]) => message.commentId)
		return { feed, level, deliver, onOpen, stop, shownIds }
	}

	it('treats what is already in the feed, or syncs in with older timestamps, as history', () => {
		const { feed, shownIds } = setup([entry('old', 500)])
		feed.set([entry('late-backlog', 900), entry('old', 500)])
		expect(shownIds()).toEqual([])
	})

	it('shows each new unread entry once', () => {
		const { feed, shownIds } = setup()
		feed.set([entry('a', 1001)])
		feed.set([entry('b', 1002), entry('a', 1001), entry('read', 1003, false)])
		expect(shownIds()).toEqual(['a', 'b'])
	})

	it('shows a reaction again when a newer one re-dates the entry', () => {
		const { feed, shownIds } = setup()
		feed.set([entry('a', 1001, true, ['reaction'])])
		feed.set([entry('a', 1005, true, ['reaction'])])
		expect(shownIds()).toEqual(['a', 'a'])
	})

	it('stays quiet while the window has focus, without replaying later', () => {
		const { feed, shownIds } = setup()
		focused = true
		feed.set([entry('a', 1001)])
		focused = false
		feed.set([entry('b', 1002), entry('a', 1001)])
		expect(shownIds()).toEqual(['b'])
	})

	it('lets the host decide what counts as focused', () => {
		focused = true
		const feed = atom('feed', [] as CommentNotification[])
		const deliver = vi.fn()
		stops.push(
			startCommentNotifier({
				getNotifications: () => feed.get(),
				getLevel: () => 'all',
				isWindowFocused: () => false,
				format: (n) => ({ tag: '', title: '', body: '', commentId: n.comment.id, threadId: '' }),
				onOpen: () => {},
				deliver,
			})
		)
		feed.set([entry('a', 1001)])
		expect(deliver).toHaveBeenCalledTimes(1)
	})

	it('does not replay what arrived while switched off', () => {
		const { feed, level, shownIds } = setup([], 'off')
		feed.set([entry('while-off', 1001)])
		vi.setSystemTime(2000)
		level.set('all')
		feed.set([entry('after', 2001), entry('while-off', 1001)])
		expect(shownIds()).toEqual(['after'])
	})

	it('filters by level, without replaying what it filtered once the level loosens', () => {
		const { feed, level, shownIds } = setup([], 'mentions')
		const board = entry('board', 1001, true, ['owned-board'])
		const mention = entry('mention', 1002, true, ['mention', 'owned-board'])
		feed.set([mention, board])
		level.set('all')
		const reaction = entry('reaction', 1003, true, ['reaction'])
		feed.set([reaction, mention, board])
		expect(shownIds()).toEqual(['mention', 'reaction'])
	})

	it('does not replay what a muted thread held back once unmuted, but lets mentions through', () => {
		const feed = atom('feed', [] as CommentNotification[])
		const muted = atom('muted', true)
		const deliver = vi.fn()
		stops.push(
			startCommentNotifier({
				getNotifications: () => feed.get(),
				getLevel: () => 'all',
				isThreadMuted: () => muted.get(),
				format: (n) => ({ tag: '', title: '', body: '', commentId: n.comment.id, threadId: '' }),
				onOpen: () => {},
				deliver,
			})
		)
		const reply = entry('reply', 1001)
		const mention = entry('mention', 1002, true, ['mention', 'reply'])
		feed.set([mention, reply])
		muted.set(false)
		feed.set([mention, reply])
		expect(deliver.mock.calls.map(([m]) => m.commentId)).toEqual(['mention'])
	})

	it('opens the message it delivered', () => {
		const { feed, deliver, onOpen } = setup()
		feed.set([entry('a', 1001)])
		const [message, open] = deliver.mock.calls[0]
		open()
		expect(onOpen).toHaveBeenCalledWith(message)
	})

	it('stops when disposed', () => {
		const { feed, stop, shownIds } = setup()
		stop()
		feed.set([entry('a', 1001)])
		expect(shownIds()).toEqual([])
	})
})

describe('isAtNotificationLevel', () => {
	const levels: CommentNotificationLevel[] = ['off', 'all', 'mentions-and-replies', 'mentions']
	const at = (...reasons: CommentNotificationReason[]) =>
		levels.filter((level) => isAtNotificationLevel(entry('a', 0, true, reasons), level))

	it('narrows from everything, to mentions and replies, to mentions, to nothing', () => {
		expect({
			mention: at('mention'),
			reply: at('reply'),
			board: at('owned-board'),
			reaction: at('reaction'),
			boardReply: at('reply', 'owned-board'),
		}).toEqual({
			mention: ['all', 'mentions-and-replies', 'mentions'],
			reply: ['all', 'mentions-and-replies'],
			board: ['all'],
			reaction: ['all'],
			boardReply: ['all', 'mentions-and-replies'],
		})
	})
})
