import { TLComment, TLCommentId, TLCommentReaction, createCommentReactionId } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { summarizeReactions } from './comment-reactions'

const COMMENT_A = 'comment:a' as TLCommentId
const COMMENT_B = 'comment:b' as TLCommentId

function reaction(userId: string, emoji: string, createdAt: number): TLCommentReaction {
	return {
		id: createCommentReactionId(COMMENT_A, userId, emoji),
		typeName: 'comment-reaction',
		commentId: COMMENT_A,
		threadId: 'comment-thread:t' as TLCommentReaction['threadId'],
		pageId: 'page:page' as TLCommentReaction['pageId'],
		userId,
		emoji,
		createdAt,
		meta: {},
	}
}

describe('summarizeReactions', () => {
	it('returns nothing when there are no reactions', () => {
		expect(summarizeReactions([], 'user1')).toEqual([])
	})

	it('counts each emoji, marks the current user’s active, and lists reactors', () => {
		expect(
			summarizeReactions(
				[reaction('user1', '👍', 100), reaction('user2', '👍', 200), reaction('user3', '🎉', 300)],
				'user1'
			)
		).toEqual([
			{
				emoji: '👍',
				count: 2,
				active: true,
				// no resolveName here, so names fall back to the generic 'Someone'
				reactors: [
					{ name: 'Someone', you: true },
					{ name: 'Someone', you: false },
				],
			},
			{ emoji: '🎉', count: 1, active: false, reactors: [{ name: 'Someone', you: false }] },
		])
	})

	// the row shouldn't reshuffle as later reactions land, so groups sort by first use
	it('orders emoji by when each was first used', () => {
		expect(
			summarizeReactions(
				[reaction('user1', '🎉', 300), reaction('user2', '👍', 100), reaction('user3', '👍', 200)],
				undefined
			).map((r) => r.emoji)
		).toEqual(['👍', '🎉'])
	})

	it('marks nothing active when there is no current user', () => {
		expect(summarizeReactions([reaction('user1', '👍', 100)], undefined)[0].active).toBe(false)
	})

	it('names reactors via resolveName, falling back to a generic name', () => {
		const resolveName = (id: string) => (id === 'user1' ? 'Ada' : undefined)
		expect(
			summarizeReactions(
				[reaction('user1', '👍', 100), reaction('user2', '👍', 200)],
				'user1',
				resolveName
			)[0].reactors
		).toEqual([
			{ name: 'Ada', you: true },
			// user2 can't be resolved — a generic name, never the raw id
			{ name: 'Someone', you: false },
		])
	})

	// reactors keep the order they're passed in (the caller sorts by reaction time), so the hover
	// list is stable
	it('lists reactors in input order', () => {
		expect(
			summarizeReactions(
				[reaction('user2', '👍', 100), reaction('user1', '👍', 200)],
				undefined,
				(id) => id.toUpperCase()
			)[0].reactors.map((r) => r.name)
		).toEqual(['USER2', 'USER1'])
	})
})

describe('createCommentReactionId', () => {
	// the id is what makes reaction identity structural: re-picking the same emoji addresses the
	// same record (toggle off), while a different emoji is its own record (independent)
	it('is stable for the same comment, user, and emoji', () => {
		expect(createCommentReactionId(COMMENT_A, 'user1', '👍')).toBe(
			createCommentReactionId(COMMENT_A, 'user1', '👍')
		)
	})

	it('differs per user, per comment, and per emoji', () => {
		expect(createCommentReactionId(COMMENT_A, 'user1', '👍')).not.toBe(
			createCommentReactionId(COMMENT_A, 'user2', '👍')
		)
		expect(createCommentReactionId(COMMENT_A, 'user1', '👍')).not.toBe(
			createCommentReactionId(COMMENT_B, 'user1', '👍')
		)
		// same user + comment, different emoji → a distinct record (this is what enables multi-react)
		expect(createCommentReactionId(COMMENT_A, 'user1', '👍')).not.toBe(
			createCommentReactionId(COMMENT_A, 'user1', '🎉')
		)
	})

	it('is a comment-reaction id, not a comment id', () => {
		const id: string = createCommentReactionId(COMMENT_A, 'user1', '👍')
		expect(id.startsWith('comment-reaction:')).toBe(true)
	})
})

describe('reaction records', () => {
	// a comment's reactions are found by commentId, so a reaction to another comment must not
	// leak into this one's tally
	it('are scoped to one comment by commentId', () => {
		const forOtherComment: TLCommentReaction = {
			...reaction('user9', '💩', 400),
			commentId: COMMENT_B,
		}
		const all = [reaction('user1', '👍', 100), forOtherComment]
		const mine = all.filter((r) => r.commentId === (COMMENT_A as TLComment['id']))
		expect(summarizeReactions(mine, 'user1')).toEqual([
			{ emoji: '👍', count: 1, active: true, reactors: [{ name: 'Someone', you: true }] },
		])
	})
})
