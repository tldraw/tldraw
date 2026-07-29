import { TLRichText } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { categorizeCommentNotifications, CommentNotificationInput } from './commentNotifications'

const ME = 'user_me'
const OTHER = 'user_other'
const THIRD = 'user_third'

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
		createdAt: 1000,
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
			createdAt: 2000,
			thread: { createdBy: OTHER, comments: [{ authorId: ME, createdAt: 1000 }] },
			file: { ownerId: THIRD },
		})
		const result = categorizeCommentNotifications([theirReply], ME)
		expect(result).toHaveLength(1)
		expect(result[0].comment.id).toBe('comment:theirs')
		expect(result[0].primaryReason).toBe('reply')
	})

	it('drops comments written before I joined the thread', () => {
		// other(1000), other(2000), me(3000)
		const thread = { createdBy: OTHER, comments: [{ authorId: ME, createdAt: 3000 }] }
		const before1 = comment({ id: 'comment:b1', createdAt: 1000, thread, file: { ownerId: THIRD } })
		const before2 = comment({ id: 'comment:b2', createdAt: 2000, thread, file: { ownerId: THIRD } })
		expect(categorizeCommentNotifications([before1, before2], ME)).toEqual([])
	})

	it('keeps replies from after I joined even once I have replied to them', () => {
		// other(1000), me(2000), other(3000), me(4000): only the pre-join comment at 1000 drops
		const thread = {
			createdBy: OTHER,
			comments: [
				{ authorId: ME, createdAt: 2000 },
				{ authorId: ME, createdAt: 4000 },
			],
		}
		const preJoin = comment({
			id: 'comment:pre',
			createdAt: 1000,
			thread,
			file: { ownerId: THIRD },
		})
		const postJoin = comment({
			id: 'comment:post',
			createdAt: 3000,
			thread,
			file: { ownerId: THIRD },
		})
		const result = categorizeCommentNotifications([preJoin, postJoin], ME)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:post'])
		expect(result[0].primaryReason).toBe('reply')
	})

	it('drops a comment timestamped identically to my join', () => {
		const thread = { createdBy: OTHER, comments: [{ authorId: ME, createdAt: 1000 }] }
		const tied = comment({ createdAt: 1000, thread, file: { ownerId: THIRD } })
		expect(categorizeCommentNotifications([tied], ME)).toEqual([])
	})

	it("ignores others' comments in the thread relation when deriving my join time", () => {
		// defense in depth: the query only syncs my own, but a foreign row must not count
		const thread = { createdBy: OTHER, comments: [{ authorId: THIRD, createdAt: 500 }] }
		const theirs = comment({ createdAt: 1000, thread, file: { ownerId: THIRD } })
		expect(categorizeCommentNotifications([theirs], ME)).toEqual([])
	})

	it('keeps a mention from before I joined the thread', () => {
		const result = categorizeCommentNotifications(
			[
				comment({
					createdAt: 1000,
					body: body('hey ', [ME]),
					thread: { createdBy: OTHER, comments: [{ authorId: ME, createdAt: 2000 }] },
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
					createdAt: 1000,
					thread: { createdBy: OTHER, comments: [{ authorId: ME, createdAt: 2000 }] },
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
		const older = comment({ id: 'comment:old', createdAt: 1000, file: { ownerId: ME } })
		const newer = comment({ id: 'comment:new', createdAt: 2000, file: { ownerId: ME } })
		const result = categorizeCommentNotifications([older, newer], ME)
		expect(result.map((n) => n.comment.id)).toEqual(['comment:new', 'comment:old'])
	})
})
