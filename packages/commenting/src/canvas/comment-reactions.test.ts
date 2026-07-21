import { TLCommentReactions, TLCommentThread } from 'tldraw'
import { describe, expect, it } from 'vitest'
import {
	nextThreadReactions,
	summarizeReactions,
	withoutCommentReactions,
} from './comment-reactions'

const COMMENT_A = 'comment:a'
const COMMENT_B = 'comment:b'

describe('summarizeReactions', () => {
	it('returns nothing when the thread has no reactions', () => {
		expect(summarizeReactions(null, COMMENT_A, 'user1')).toEqual([])
		expect(summarizeReactions({}, COMMENT_A, 'user1')).toEqual([])
	})

	it('returns nothing for a comment nobody has reacted to', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_B]: { user1: { emoji: '👍', createdAt: 100 } },
		}
		expect(summarizeReactions(reactions, COMMENT_A, 'user1')).toEqual([])
	})

	it('counts each emoji and marks the current user’s as active', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_A]: {
				user1: { emoji: '👍', createdAt: 100 },
				user2: { emoji: '👍', createdAt: 200 },
				user3: { emoji: '🎉', createdAt: 300 },
			},
		}
		expect(summarizeReactions(reactions, COMMENT_A, 'user1')).toEqual([
			{ emoji: '👍', count: 2, active: true },
			{ emoji: '🎉', count: 1, active: false },
		])
	})

	// the row shouldn't reshuffle as later reactions land, so groups sort by first use
	it('orders emoji by when each was first used', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_A]: {
				user1: { emoji: '🎉', createdAt: 300 },
				user2: { emoji: '👍', createdAt: 100 },
				user3: { emoji: '👍', createdAt: 200 },
			},
		}
		expect(summarizeReactions(reactions, COMMENT_A, undefined).map((r) => r.emoji)).toEqual([
			'👍',
			'🎉',
		])
	})

	it('marks nothing active when there is no current user', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_A]: { user1: { emoji: '👍', createdAt: 100 } },
		}
		expect(summarizeReactions(reactions, COMMENT_A, undefined)).toEqual([
			{ emoji: '👍', count: 1, active: false },
		])
	})

	it('keeps each comment’s reactions separate', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_A]: { user1: { emoji: '👍', createdAt: 100 } },
			[COMMENT_B]: { user1: { emoji: '🎉', createdAt: 200 } },
		}
		expect(summarizeReactions(reactions, COMMENT_B, 'user1')).toEqual([
			{ emoji: '🎉', count: 1, active: true },
		])
	})
})

describe('nextThreadReactions', () => {
	it('adds a reaction when the thread has none', () => {
		expect(nextThreadReactions(null, COMMENT_A, 'user1', '👍', 500)).toEqual({
			[COMMENT_A]: { user1: { emoji: '👍', createdAt: 500 } },
		})
	})

	it('clears the reaction when the user picks the same emoji again', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_A]: { user1: { emoji: '👍', createdAt: 100 } },
		}
		expect(nextThreadReactions(reactions, COMMENT_A, 'user1', '👍', 500)).toBeNull()
	})

	// one reaction per user per comment is the shape, so a second pick moves theirs
	it('replaces the user’s reaction when they pick a different emoji', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_A]: { user1: { emoji: '👍', createdAt: 100 } },
		}
		expect(nextThreadReactions(reactions, COMMENT_A, 'user1', '🎉', 500)).toEqual({
			[COMMENT_A]: { user1: { emoji: '🎉', createdAt: 500 } },
		})
	})

	it('leaves other people’s reactions alone', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_A]: {
				user1: { emoji: '👍', createdAt: 100 },
				user2: { emoji: '👍', createdAt: 200 },
			},
		}
		expect(nextThreadReactions(reactions, COMMENT_A, 'user1', '🎉', 500)).toEqual({
			[COMMENT_A]: {
				user2: { emoji: '👍', createdAt: 200 },
				user1: { emoji: '🎉', createdAt: 500 },
			},
		})
	})

	it('leaves other comments’ reactions alone', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_B]: { user2: { emoji: '👀', createdAt: 200 } },
		}
		expect(nextThreadReactions(reactions, COMMENT_A, 'user1', '👍', 500)).toEqual({
			[COMMENT_B]: { user2: { emoji: '👀', createdAt: 200 } },
			[COMMENT_A]: { user1: { emoji: '👍', createdAt: 500 } },
		})
	})

	// an emptied comment key shouldn't linger as `{}` — "nobody has reacted" is one state
	it('prunes a comment’s entry when its last reaction goes', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_A]: { user1: { emoji: '👍', createdAt: 100 } },
			[COMMENT_B]: { user2: { emoji: '👀', createdAt: 200 } },
		}
		expect(nextThreadReactions(reactions, COMMENT_A, 'user1', '👍', 500)).toEqual({
			[COMMENT_B]: { user2: { emoji: '👀', createdAt: 200 } },
		})
	})

	it('does not mutate the reactions it was given', () => {
		const reactions: TLCommentReactions = {
			[COMMENT_A]: { user1: { emoji: '👍', createdAt: 100 } },
		}
		nextThreadReactions(reactions, COMMENT_A, 'user2', '🎉', 500)
		expect(reactions).toEqual({ [COMMENT_A]: { user1: { emoji: '👍', createdAt: 100 } } })
	})
})

describe('withoutCommentReactions', () => {
	const thread = (reactions: TLCommentReactions | null) =>
		({ id: 'comment-thread:t', reactions }) as TLCommentThread

	it('drops the deleted comment’s reactions', () => {
		const before = thread({
			[COMMENT_A]: { user1: { emoji: '👍', createdAt: 100 } },
			[COMMENT_B]: { user2: { emoji: '👀', createdAt: 200 } },
		})
		expect(withoutCommentReactions(before, COMMENT_A).reactions).toEqual({
			[COMMENT_B]: { user2: { emoji: '👀', createdAt: 200 } },
		})
	})

	it('collapses to null when the last comment’s reactions go', () => {
		const before = thread({ [COMMENT_A]: { user1: { emoji: '👍', createdAt: 100 } } })
		expect(withoutCommentReactions(before, COMMENT_A).reactions).toBeNull()
	})

	// returning the same reference lets callers write unconditionally without churning the record
	it('returns the thread unchanged when there was nothing to remove', () => {
		const before = thread({ [COMMENT_B]: { user2: { emoji: '👀', createdAt: 200 } } })
		expect(withoutCommentReactions(before, COMMENT_A)).toBe(before)
		const noReactions = thread(null)
		expect(withoutCommentReactions(noReactions, COMMENT_A)).toBe(noReactions)
	})
})
