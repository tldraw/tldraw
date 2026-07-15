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
		const mine = comment({
			id: 'comment:mine',
			authorId: ME,
			createdAt: 1000,
			thread: { createdBy: OTHER },
			file: { ownerId: THIRD },
		})
		const theirReply = comment({
			id: 'comment:theirs',
			authorId: OTHER,
			createdAt: 2000,
			thread: { createdBy: OTHER },
			file: { ownerId: THIRD },
		})
		const result = categorizeCommentNotifications([mine, theirReply], ME)
		// only their reply surfaces (mine is excluded), tagged reply
		expect(result).toHaveLength(1)
		expect(result[0].comment.id).toBe('comment:theirs')
		expect(result[0].primaryReason).toBe('reply')
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

	it('falls back to reply when no reason is derivable from the synced window', () => {
		// The server only syncs in-category comments, so a comment with no locally visible
		// evidence (not my board, no mention of me, my thread participation older than the
		// window) must be a reply — it is labeled, not dropped.
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
		expect(result).toHaveLength(1)
		expect(result[0].reasons).toEqual(['reply'])
		expect(result[0].primaryReason).toBe('reply')
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
