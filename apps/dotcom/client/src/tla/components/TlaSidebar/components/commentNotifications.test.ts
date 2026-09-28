import { TLRichText } from 'tldraw'
import { describe, expect, it } from 'vitest'
import {
	buildReactionNotifications,
	categorizeCommentNotifications,
	CommentNotificationInput,
	mergeNotifications,
	summarizeForeignReactors,
} from './commentNotifications'

const ME = 'user_me'
const OTHER = 'user_other'
const THIRD = 'user_third'

/** Event times, in minutes from an arbitrary epoch. */
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
		fileId: 'file:1',
		threadId: 'comment-thread:1',
		createdAt: at(0),
		body: body('hello'),
		read: undefined,
		file: { owningGroupId: THIRD },
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
			[comment({ file: { owningGroupId: ME }, thread: { createdBy: OTHER } })],
			ME
		)
		expect(result).toHaveLength(1)
		expect(result[0].reasons).toEqual(['owned-board'])
		expect(result[0].primaryReason).toBe('owned-board')
	})

	it('excludes my own comments', () => {
		const result = categorizeCommentNotifications(
			[comment({ authorId: ME, file: { owningGroupId: ME }, body: body('hi ', [ME]) })],
			ME
		)
		expect(result).toEqual([])
	})

	it('labels a reply in a thread I started as reply', () => {
		const result = categorizeCommentNotifications(
			[comment({ thread: { createdBy: ME }, file: { owningGroupId: THIRD } })],
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
			file: { owningGroupId: THIRD },
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
			file: { owningGroupId: THIRD },
		})
		const before2 = comment({
			id: 'comment:b2',
			createdAt: at(10),
			thread,
			file: { owningGroupId: THIRD },
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
			file: { owningGroupId: THIRD },
		})
		const postJoin = comment({
			id: 'comment:post',
			createdAt: at(20),
			thread,
			file: { owningGroupId: THIRD },
		})
		const result = categorizeCommentNotifications([preJoin, postJoin], ME)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:post'])
		expect(result[0].primaryReason).toBe('reply')
	})

	it("does not resurface a thread's opening comment when I reply to it seconds later", () => {
		// A starts a thread, B replies right away: A's opening comment is context B already saw,
		// not a reply to B, no matter how narrowly it predates B's join.
		const thread = { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(0) + 5_000 }] }
		const opener = comment({ createdAt: at(0), thread, file: { owningGroupId: THIRD } })
		expect(categorizeCommentNotifications([opener], ME)).toEqual([])
	})

	it('drops a comment stamped at exactly my join time', () => {
		// The gate is strict: same-instant means "not after me". Postgres stamps createdAt
		// monotonically per thread (migration 046), so real replies can never tie with my join.
		const thread = { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(10) }] }
		const tied = comment({ createdAt: at(10), thread, file: { owningGroupId: THIRD } })
		expect(categorizeCommentNotifications([tied], ME)).toEqual([])
	})

	it('keeps a reply stamped just after my join', () => {
		const thread = { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(10) }] }
		const reply = comment({ createdAt: at(10) + 1, thread, file: { owningGroupId: THIRD } })
		const result = categorizeCommentNotifications([reply], ME)
		expect(result.map((n) => n.primaryReason)).toEqual(['reply'])
	})

	it("ignores others' comments in the thread relation when deriving my join time", () => {
		// defense in depth: the query only syncs my own, but a foreign row must not count
		const thread = { createdBy: OTHER, comments: [{ authorId: THIRD, createdAt: at(0) }] }
		const theirs = comment({ createdAt: at(10), thread, file: { owningGroupId: THIRD } })
		expect(categorizeCommentNotifications([theirs], ME)).toEqual([])
	})

	it('keeps a mention from before I joined the thread', () => {
		const result = categorizeCommentNotifications(
			[
				comment({
					createdAt: at(0),
					body: body('hey ', [ME]),
					thread: { createdBy: OTHER, comments: [{ authorId: ME, createdAt: at(10) }] },
					file: { owningGroupId: THIRD },
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
			[comment({ thread: null, file: { owningGroupId: ME } })],
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
					file: { owningGroupId: ME },
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
					file: { owningGroupId: THIRD },
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
					file: { owningGroupId: THIRD },
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
			[
				comment({
					file: { owningGroupId: ME },
					thread: { createdBy: ME },
					body: body('hey ', [ME]),
				}),
			],
			ME
		)
		expect(result).toHaveLength(1)
		expect(new Set(result[0].reasons)).toEqual(new Set(['mention', 'reply', 'owned-board']))
		expect(result[0].primaryReason).toBe('mention')
	})

	it('sorts newest first', () => {
		const older = comment({ id: 'comment:old', createdAt: at(0), file: { owningGroupId: ME } })
		const newer = comment({ id: 'comment:new', createdAt: at(10), file: { owningGroupId: ME } })
		const result = categorizeCommentNotifications([older, newer], ME)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:new', 'comment:old'])
	})

	it('marks a comment notification unread until it has a read receipt', () => {
		const unread = categorizeCommentNotifications([comment({ file: { owningGroupId: ME } })], ME)
		expect(unread[0].unread).toBe(true)
		const read = categorizeCommentNotifications(
			[comment({ file: { owningGroupId: ME }, read: { readAt: at(1) } })],
			ME
		)
		expect(read[0].unread).toBe(false)
	})
})

describe('buildReactionNotifications', () => {
	/** One row of the reactions feed: my own comment, carrying the full `reactions` set the entry
	 *  derives its timestamp and pills from. */
	function mine(overrides: Partial<CommentNotificationInput> = {}): CommentNotificationInput {
		return comment({
			authorId: ME,
			thread: { createdBy: ME },
			file: { owningGroupId: THIRD },
			reactions: [{ userId: OTHER, userName: 'Other', emoji: '👍', createdAt: at(10) }],
			...overrides,
		})
	}

	it('makes one entry per comment, however many people reacted', () => {
		const result = buildReactionNotifications(
			[
				mine({
					reactions: [
						{ userId: OTHER, userName: 'Other', emoji: '👍', createdAt: at(10) },
						{ userId: THIRD, userName: 'Third', emoji: '🎉', createdAt: at(20) },
					],
				}),
			],
			ME
		)
		expect(result).toHaveLength(1)
		expect(result[0].reasons).toEqual(['reaction'])
		expect(result[0].primaryReason).toBe('reaction')
	})

	it('makes two entries for two reacted-to comments', () => {
		const result = buildReactionNotifications(
			[mine({ id: 'comment:1' }), mine({ id: 'comment:2' })],
			ME
		)
		expect(result.map((n) => n.comment.id).sort()).toEqual(['comment:1', 'comment:2'])
	})

	it("carries the comment's full reactions set unmodified, own reaction included", () => {
		const fullReactions = [
			{ userId: OTHER, userName: 'Other', emoji: '👍', createdAt: at(5) },
			{ userId: THIRD, userName: 'Third', emoji: '🎉', createdAt: at(20) },
			{ userId: ME, userName: 'Me', emoji: '🔥', createdAt: at(15) },
		]
		const result = buildReactionNotifications([mine({ reactions: fullReactions })], ME)
		expect(result).toHaveLength(1)
		expect(result[0].comment.reactions).toBe(fullReactions)
	})

	it('timestamps the entry by the newest foreign reaction, ignoring my own and the comment date', () => {
		const result = buildReactionNotifications(
			[
				mine({
					createdAt: at(0),
					reactions: [
						{ userId: OTHER, userName: 'Other', emoji: '👍', createdAt: at(10) },
						{ userId: THIRD, userName: 'Third', emoji: '🎉', createdAt: at(20) },
						{ userId: ME, userName: 'Me', emoji: '🔥', createdAt: at(30) },
					],
				}),
			],
			ME
		)
		expect(result[0].timestamp).toBe(at(20))
	})

	it('drops the entry when the comment has no foreign reaction left', () => {
		const result = buildReactionNotifications(
			[mine({ reactions: [{ userId: ME, userName: 'Me', emoji: '👍', createdAt: at(10) }] })],
			ME
		)
		expect(result).toEqual([])
	})

	it('is unread until my read receipt is newer than the newest foreign reaction', () => {
		const withReadAt = (readAt: number | undefined) =>
			buildReactionNotifications(
				[mine({ read: readAt === undefined ? undefined : { readAt } })],
				ME
			)[0].unread
		expect(withReadAt(undefined)).toBe(true)
		// a stale receipt (read before this reaction landed) leaves the entry unread
		expect(withReadAt(at(5))).toBe(true)
		// the watermark comparison is strict: a receipt from the same instant counts as read
		expect(withReadAt(at(10))).toBe(false)
		expect(withReadAt(at(15))).toBe(false)
	})

	it("drops someone else's comment as a belt against a foreign row slipping through", () => {
		const result = buildReactionNotifications([mine({ authorId: OTHER })], ME)
		expect(result).toEqual([])
	})

	it('sorts reaction entries among comment entries by their reaction time', () => {
		const reacted = buildReactionNotifications(
			[
				mine({
					id: 'comment:reacted',
					createdAt: at(0),
					reactions: [{ userId: OTHER, userName: 'Other', emoji: '👍', createdAt: at(20) }],
				}),
			],
			ME
		)
		const replied = categorizeCommentNotifications(
			[comment({ id: 'comment:replied', createdAt: at(10), file: { owningGroupId: ME } })],
			ME
		)
		const result = mergeNotifications(replied, reacted)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:reacted', 'comment:replied'])
	})
})

describe('mergeNotifications', () => {
	it('merges multiple feeds newest first', () => {
		const a = categorizeCommentNotifications(
			[
				comment({ id: 'comment:a1', createdAt: at(0), file: { owningGroupId: ME } }),
				comment({ id: 'comment:a2', createdAt: at(20), file: { owningGroupId: ME } }),
			],
			ME
		)
		const b = categorizeCommentNotifications(
			[comment({ id: 'comment:b1', createdAt: at(10), file: { owningGroupId: ME } })],
			ME
		)
		const result = mergeNotifications(a, b)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:a2', 'comment:b1', 'comment:a1'])
	})

	it('handles no feeds and empty feeds', () => {
		expect(mergeNotifications()).toEqual([])
		expect(mergeNotifications([], [])).toEqual([])
	})
})

describe('summarizeForeignReactors', () => {
	const r = (userId: string, userName: string, createdAt: number, emoji = '👍') => ({
		userId,
		userName,
		emoji,
		createdAt,
	})

	it('returns no names for no foreign reactions', () => {
		expect(summarizeForeignReactors([r('me', 'Me', 1)], 'me')).toEqual({
			names: [],
			others: 0,
			total: 0,
		})
	})

	it('drops names missing at runtime but still counts the reactor', () => {
		// rows synced before a view-syncer picks up the userName column arrive without it,
		// defeating the type — never render "undefined reacted to your comment"
		const ghost = { userId: 'ghost', emoji: '👍', createdAt: 3 } as unknown as ReturnType<typeof r>
		expect(summarizeForeignReactors([r('bo', 'Bo', 1), ghost], 'me')).toEqual({
			names: ['Bo'],
			others: 1,
			total: 2,
		})
	})

	it('names a single reactor', () => {
		expect(summarizeForeignReactors([r('bo', 'Bo', 1)], 'me')).toEqual({
			names: ['Bo'],
			others: 0,
			total: 1,
		})
	})

	it('caps at two names, newest reaction first, counting the rest as others', () => {
		const reactions = [r('bo', 'Bo', 1), r('ada', 'Ada', 3), r('cy', 'Cy', 2)]
		expect(summarizeForeignReactors(reactions, 'me')).toEqual({
			names: ['Ada', 'Cy'],
			others: 1,
			total: 3,
		})
	})

	it('counts one person with several emoji once, dated by their newest reaction', () => {
		const reactions = [r('bo', 'Bo', 1, '👍'), r('ada', 'Ada', 2), r('bo', 'Bo', 3, '🔥')]
		expect(summarizeForeignReactors(reactions, 'me')).toEqual({
			names: ['Bo', 'Ada'],
			others: 0,
			total: 2,
		})
	})

	it('skips empty names but still counts them', () => {
		const reactions = [r('ghost', '', 3), r('bo', 'Bo', 1)]
		expect(summarizeForeignReactors(reactions, 'me')).toEqual({
			names: ['Bo'],
			others: 1,
			total: 2,
		})
	})

	it('handles undefined reactions', () => {
		expect(summarizeForeignReactors(undefined, 'me')).toEqual({ names: [], others: 0, total: 0 })
	})
})
