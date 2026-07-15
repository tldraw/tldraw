import { TLRichText } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { getMentionedMemberIds } from '../../../utils/richText'
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

describe('getMentionedMemberIds', () => {
	it('collects mention node ids from the body', () => {
		expect(getMentionedMemberIds(body('hi ', [ME, OTHER]))).toEqual([ME, OTHER])
	})

	it('returns an empty array when there are no mentions', () => {
		expect(getMentionedMemberIds(body('just text'))).toEqual([])
	})
})

describe('categorizeCommentNotifications', () => {
	it('returns nothing when there is no user id', () => {
		expect(categorizeCommentNotifications([comment()], undefined)).toEqual([])
	})

	it("includes another user's comment on a board I own, as owned-board", () => {
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

	it('includes a reply in a thread I started, as reply', () => {
		const result = categorizeCommentNotifications(
			[comment({ thread: { createdBy: ME }, file: { ownerId: THIRD } })],
			ME
		)
		expect(result.map((n) => n.primaryReason)).toEqual(['reply'])
	})

	it("includes a reply in a thread I've commented in, as reply", () => {
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

	it('includes a comment that @-mentions me, as mention', () => {
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

	it('excludes a comment that only mentions someone else', () => {
		const result = categorizeCommentNotifications(
			[
				comment({
					body: body('hey ', [THIRD]),
					file: { ownerId: THIRD },
					thread: { createdBy: OTHER },
				}),
			],
			ME
		)
		expect(result).toEqual([])
	})

	it('excludes a comment matching none of the three categories', () => {
		const result = categorizeCommentNotifications(
			[
				comment({
					file: { ownerId: THIRD },
					thread: { createdBy: OTHER },
					body: body('unrelated'),
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
