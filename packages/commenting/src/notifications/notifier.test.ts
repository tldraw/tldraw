import { atom } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	CommentNotification,
	CommentNotificationLevel,
	CommentNotificationReason,
	isAtNotificationLevel,
} from './comment-notifications'
import { startCommentNotifier } from './notifier'

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
	beforeEach(() => {
		vi.useFakeTimers({ now: 1000 })
		focused = false
		vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
	})
	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	function setup(
		initial: CommentNotification[] = [],
		enabled = true,
		initialLevel: CommentNotificationLevel = 'all'
	) {
		const feed = atom('feed', initial)
		const isEnabled = atom('enabled', enabled)
		const level = atom('level', initialLevel)
		const show = vi.fn()
		const onClick = vi.fn()
		const stop = startCommentNotifier({
			getNotifications: () => feed.get(),
			isEnabled: () => isEnabled.get(),
			shouldShow: (n) => isAtNotificationLevel(n, level.get()),
			format: (n) => ({ title: n.comment.id, body: '' }),
			onClick,
			show,
		})
		const shownIds = () => show.mock.calls.map(([n]) => n.comment.id)
		return { feed, isEnabled, level, show, onClick, stop, shownIds }
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
		feed.set([entry('a', 1001)])
		feed.set([entry('a', 1005)])
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
		const show = vi.fn()
		const stop = startCommentNotifier({
			getNotifications: () => feed.get(),
			isEnabled: () => true,
			isWindowFocused: () => false,
			format: (n) => ({ title: n.comment.id, body: '' }),
			onClick: () => {},
			show,
		})
		feed.set([entry('a', 1001)])
		expect(show).toHaveBeenCalledTimes(1)
		stop()
	})

	it('does not replay what arrived while switched off', () => {
		const { feed, isEnabled, shownIds } = setup([], false)
		feed.set([entry('while-off', 1001)])
		vi.setSystemTime(2000)
		isEnabled.set(true)
		feed.set([entry('after', 2001), entry('while-off', 1001)])
		expect(shownIds()).toEqual(['after'])
	})

	it('filters by level, without replaying what it filtered once the level loosens', () => {
		const { feed, level, shownIds } = setup([], true, 'mentions')
		const board = entry('board', 1001, true, ['owned-board'])
		const mention = entry('mention', 1002, true, ['mention', 'owned-board'])
		feed.set([mention, board])
		level.set('all')
		const reaction = entry('reaction', 1003, true, ['reaction'])
		feed.set([reaction, mention, board])
		expect(shownIds()).toEqual(['mention', 'reaction'])
	})

	it('routes a click to onClick with its entry', () => {
		const { feed, show, onClick } = setup()
		feed.set([entry('a', 1001)])
		show.mock.calls[0][2]()
		expect(onClick).toHaveBeenCalledWith(entry('a', 1001))
	})

	it('stops when disposed', () => {
		const { feed, stop, shownIds } = setup()
		stop()
		feed.set([entry('a', 1001)])
		expect(shownIds()).toEqual([])
	})
})

describe('isAtNotificationLevel', () => {
	const levels: CommentNotificationLevel[] = ['all', 'mentions-and-replies', 'mentions']
	const at = (...reasons: CommentNotificationReason[]) =>
		levels.filter((level) => isAtNotificationLevel(entry('a', 0, true, reasons), level))

	it('narrows from everything, to mentions and replies, to mentions', () => {
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
