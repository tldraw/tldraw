import { TLRichText } from 'tldraw'
import { describe, expect, it } from 'vitest'
import {
	categorizeCommentNotifications,
	CommentNotificationInput,
	summarizeForeignReactors,
} from './commentNotifications'

const ME = 'user_me'
const OTHER = 'user_other'
const THIRD = 'user_third'

/**
 * Event times, in minutes from an arbitrary epoch. The join gate tolerates a minute of clock skew
 * between authors, so tests that turn on it space their events well past that — timestamps a few
 * milliseconds apart would all land inside the tolerance and say nothing about the gate.
 */
const at = (minutes: number) => 1_700_000_000_000 + minutes * 60_000

/** A comment body: paragraphs of plain text, with optional `@`-mentions (by member id) interleaved. */
function body(text: string, mentionIds: string[] = []): TLRichText {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text },
					...mentionIds.map((id) => ({ type: 'mention', attrs: { id, label: id } })),
				],
			},
		],
	} as unknown as TLRichText
}

function comment(overrides: Partial<CommentNotificationInput> = {}): CommentNotificationInput {
	return {
		id: 'comment:1',
		authorId: OTHER,
		threadId: 'comment-thread:1',
		createdAt: at(0),
		body: body('hello'),
		read: undefined,
		file: { ownerId: THIRD },
		thread: { createdBy: OTHER },
		...overrides,
	}
}

describe('categorizeCommentNotifications', () => {
	it('returns nothing when there is no user id', () => {
		expect(categorizeCommentNotifications([comment()], undefined)).toEqual([])
	})

	it("labels another user's comment on a board I own as owned-board", () => {
		const result = categorizeCommentNotifications(
			[comment({ file: { ownerId: ME }, thread: { createdBy: OTHER } })],
			ME
		)
		expect(result).toHaveLength(1)
		expect(result[0].reasons).toEqual(['owned-board'])
		expect(result[0].primaryReason).toBe('owned-board')
	})

	it('excludes my own comments', () => {
		const result = categorizeCommentNotifications(
			[comment({ authorId: ME, file: { ownerId: ME }, body: body('hi ', [ME]) })],
			ME
		)
		expect(result).toEqual([])
	})

	it('labels a reply in a thread I started as reply', () => {
		const result = categorizeCommentNotifications(
			[comment({ thread: { createdBy: ME }, file: { ownerId: THIRD } })],
			ME
		)
		expect(result.map((n) => n.primaryReason)).toEqual(['reply'])
	})

	it("labels a reply in a thread I've commented in as reply", () => {
		const theirReply = comment({
			id: 'comment:theirs',
			authorId: OTHER,
			createdAt: at(10),
			thread: { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(0) }] },
			file: { ownerId: THIRD },
		})
		const result = categorizeCommentNotifications([theirReply], ME)
		expect(result).toHaveLength(1)
		expect(result[0].comment.id).toBe('comment:theirs')
		expect(result[0].primaryReason).toBe('reply')
	})

	it('drops comments written before I joined the thread', () => {
		// other(0m), other(10m), me(20m)
		const thread = { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(20) }] }
		const before1 = comment({
			id: 'comment:b1',
			createdAt: at(0),
			thread,
			file: { ownerId: THIRD },
		})
		const before2 = comment({
			id: 'comment:b2',
			createdAt: at(10),
			thread,
			file: { ownerId: THIRD },
		})
		expect(categorizeCommentNotifications([before1, before2], ME)).toEqual([])
	})

	it('keeps replies from after I joined even once I have replied to them', () => {
		// other(0m), me(10m), other(20m), me(30m): only the pre-join comment at 0m drops
		const thread = {
			createdBy: OTHER,
			comments: [
				{ authorId: ME, createdAt: at(10) },
				{ authorId: ME, createdAt: at(30) },
			],
		}
		const preJoin = comment({
			id: 'comment:pre',
			createdAt: at(0),
			thread,
			file: { ownerId: THIRD },
		})
		const postJoin = comment({
			id: 'comment:post',
			createdAt: at(20),
			thread,
			file: { ownerId: THIRD },
		})
		const result = categorizeCommentNotifications([preJoin, postJoin], ME)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:post'])
		expect(result[0].primaryReason).toBe('reply')
	})

	it('keeps a comment from just before my join, absorbing clock skew between authors', () => {
		// createdAt is stamped by each author's own clock, so a reply that really did follow my
		// join can carry an earlier timestamp than it. Inside the tolerance it still counts.
		const thread = { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(10) }] }
		const tied = comment({
			id: 'comment:tied',
			createdAt: at(10),
			thread,
			file: { ownerId: THIRD },
		})
		const skewed = comment({
			id: 'comment:skewed',
			createdAt: at(10) - 30_000,
			thread,
			file: { ownerId: THIRD },
		})
		const result = categorizeCommentNotifications([tied, skewed], ME)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:tied', 'comment:skewed'])
		expect(result.map((n) => n.primaryReason)).toEqual(['reply', 'reply'])
	})

	it('drops a comment older than my join by more than the skew tolerance', () => {
		const thread = { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(10) }] }
		const stale = comment({ createdAt: at(10) - 90_000, thread, file: { ownerId: THIRD } })
		expect(categorizeCommentNotifications([stale], ME)).toEqual([])
	})

	it("ignores others' comments in the thread relation when deriving my join time", () => {
		// defense in depth: the query only syncs my own, but a foreign row must not count
		const thread = { createdBy: OTHER, comments: [{ authorId: THIRD, createdAt: at(0) }] }
		const theirs = comment({ createdAt: at(10), thread, file: { ownerId: THIRD } })
		expect(categorizeCommentNotifications([theirs], ME)).toEqual([])
	})

	it('keeps a mention from before I joined the thread', () => {
		const result = categorizeCommentNotifications(
			[
				comment({
					createdAt: at(0),
					body: body('hey ', [ME]),
					thread: { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(10) }] },
					file: { ownerId: THIRD },
				}),
			],
			ME
		)
		expect(result).toHaveLength(1)
		// reply must not leak in for a pre-join comment
		expect(result[0].reasons).toEqual(['mention'])
		expect(result[0].primaryReason).toBe('mention')
	})

	it('never labels reply when the thread relation is missing', () => {
		const result = categorizeCommentNotifications(
			[comment({ thread: null, file: { ownerId: ME } })],
			ME
		)
		expect(result).toHaveLength(1)
		expect(result[0].reasons).toEqual(['owned-board'])
	})

	it('keeps an owned-board comment from before I joined the thread', () => {
		const result = categorizeCommentNotifications(
			[
				comment({
					createdAt: at(0),
					thread: { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(10) }] },
					file: { ownerId: ME },
				}),
			],
			ME
		)
		expect(result).toHaveLength(1)
		expect(result[0].reasons).toEqual(['owned-board'])
	})

	it('labels a comment that @-mentions me as mention', () => {
		const result = categorizeCommentNotifications(
			[
				comment({
					body: body('hey ', [ME]),
					file: { ownerId: THIRD },
					thread: { createdBy: OTHER },
				}),
			],
			ME
		)
		expect(result.map((n) => n.primaryReason)).toEqual(['mention'])
	})

	it('drops a comment with no derivable reason', () => {
		// not my board, no mention of me, no participation evidence
		const result = categorizeCommentNotifications(
			[
				comment({
					file: { ownerId: THIRD },
					thread: { createdBy: OTHER },
					body: body('hey ', [THIRD]),
				}),
			],
			ME
		)
		expect(result).toEqual([])
	})

	it('tags multiple reasons with mention > reply > owned-board precedence', () => {
		const result = categorizeCommentNotifications(
			[comment({ file: { ownerId: ME }, thread: { createdBy: ME }, body: body('hey ', [ME]) })],
			ME
		)
		expect(result).toHaveLength(1)
		expect(new Set(result[0].reasons)).toEqual(new Set(['mention', 'reply', 'owned-board']))
		expect(result[0].primaryReason).toBe('mention')
	})

	it('sorts newest first', () => {
		const older = comment({ id: 'comment:old', createdAt: at(0), file: { ownerId: ME } })
		const newer = comment({ id: 'comment:new', createdAt: at(10), file: { ownerId: ME } })
		const result = categorizeCommentNotifications([older, newer], ME)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:new', 'comment:old'])
	})

	it('marks a comment notification unread until it has a read receipt', () => {
		const unread = categorizeCommentNotifications([comment({ file: { ownerId: ME } })], ME)
		expect(unread[0].unread).toBe(true)
		const read = categorizeCommentNotifications(
			[comment({ file: { ownerId: ME }, read: { readAt: at(1) } })],
			ME
		)
		expect(read[0].unread).toBe(false)
	})
})

describe('reaction notifications', () => {
	/** My own comment, with reactions. */
	function mine(overrides: Partial<CommentNotificationInput> = {}): CommentNotificationInput {
		return comment({
			authorId: ME,
			thread: { createdBy: ME },
			file: { ownerId: THIRD },
			...overrides,
		})
	}

	it("labels my comment with someone else's reaction as reaction", () => {
		const result = categorizeCommentNotifications(
			[mine({ reactions: [{ userId: OTHER, emoji: '👍', createdAt: at(10) }] })],
			ME
		)
		expect(result).toHaveLength(1)
		expect(result[0].reasons).toEqual(['reaction'])
		expect(result[0].primaryReason).toBe('reaction')
	})

	it('drops my comment with no reactions, or with only my own', () => {
		expect(categorizeCommentNotifications([mine()], ME)).toEqual([])
		expect(
			categorizeCommentNotifications(
				[mine({ reactions: [{ userId: ME, emoji: '👍', createdAt: at(10) }] })],
				ME
			)
		).toEqual([])
	})

	it("never labels others' comments as reaction, whatever their reactions", () => {
		const theirs = comment({
			file: { ownerId: ME },
			reactions: [{ userId: THIRD, emoji: '👍', createdAt: at(10) }],
		})
		const result = categorizeCommentNotifications([theirs], ME)
		expect(result[0].reasons).toEqual(['owned-board'])
	})

	it('timestamps the entry by the newest foreign reaction, ignoring my own later one', () => {
		const result = categorizeCommentNotifications(
			[
				mine({
					createdAt: at(0),
					reactions: [
						{ userId: OTHER, emoji: '👍', createdAt: at(10) },
						{ userId: THIRD, emoji: '🎉', createdAt: at(20) },
						{ userId: ME, emoji: '👍', createdAt: at(30) },
					],
				}),
			],
			ME
		)
		expect(result[0].timestamp).toBe(at(20))
	})

	it('is unread until my read receipt is newer than the newest foreign reaction', () => {
		const withReadAt = (readAt: number | undefined) =>
			categorizeCommentNotifications(
				[
					mine({
						read: readAt === undefined ? undefined : { readAt },
						reactions: [{ userId: OTHER, emoji: '👍', createdAt: at(10) }],
					}),
				],
				ME
			)[0].unread
		expect(withReadAt(undefined)).toBe(true)
		// a stale receipt (read before this reaction landed) leaves the entry unread
		expect(withReadAt(at(5))).toBe(true)
		expect(withReadAt(at(15))).toBe(false)
	})

	it('sorts reaction entries among comment entries by their reaction time', () => {
		const reacted = mine({
			id: 'comment:reacted',
			createdAt: at(0),
			reactions: [{ userId: OTHER, emoji: '👍', createdAt: at(20) }],
		})
		const replied = comment({ id: 'comment:replied', createdAt: at(10), file: { ownerId: ME } })
		const result = categorizeCommentNotifications([replied, reacted], ME)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:reacted', 'comment:replied'])
	})
})

describe('summarizeForeignReactors', () => {
	const names = new Map([
		[OTHER, 'Olive'],
		[THIRD, 'Théo'],
	])
	const resolve = (id: string) => names.get(id)

	it('names the newest resolvable reactor and counts the rest', () => {
		const result = summarizeForeignReactors(
			[
				{ userId: THIRD, emoji: '👍', createdAt: at(0) },
				{ userId: OTHER, emoji: '🎉', createdAt: at(10) },
			],
			ME,
			resolve
		)
		expect(result).toEqual({ name: 'Olive', others: 1, total: 2 })
	})

	it('counts a reactor once however many emoji they used, and skips my own reactions', () => {
		const result = summarizeForeignReactors(
			[
				{ userId: OTHER, emoji: '👍', createdAt: at(0) },
				{ userId: OTHER, emoji: '🎉', createdAt: at(10) },
				{ userId: ME, emoji: '👍', createdAt: at(20) },
			],
			ME,
			resolve
		)
		expect(result).toEqual({ name: 'Olive', others: 0, total: 1 })
	})

	it('falls back to an older reactor when the newest has no resolvable name', () => {
		const result = summarizeForeignReactors(
			[
				{ userId: THIRD, emoji: '👍', createdAt: at(0) },
				{ userId: 'user_stranger', emoji: '🎉', createdAt: at(10) },
			],
			ME,
			resolve
		)
		expect(result).toEqual({ name: 'Théo', others: 1, total: 2 })
	})

	it('gives no name when nobody resolves', () => {
		const result = summarizeForeignReactors(
			[
				{ userId: 'user_a', emoji: '👍', createdAt: at(0) },
				{ userId: 'user_b', emoji: '🎉', createdAt: at(10) },
			],
			ME,
			resolve
		)
		expect(result).toEqual({ name: undefined, others: 2, total: 2 })
	})
})
