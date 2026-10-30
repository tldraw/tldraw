import {
	TLComment,
	TLCommentId,
	TLCommentReaction,
	TLCommentThread,
	TLCommentThreadId,
	TLRichText,
	createCommentReactionId,
} from 'tldraw'
import { describe, expect, it } from 'vitest'
import { buildStoreCommentNotifications } from './store-notifications'

const ME = 'me'
const OTHER = 'other'
const THREAD = 'comment-thread:t' as TLCommentThreadId
const PAGE = 'page:page' as TLComment['pageId']

function body(mentionIds: string[] = []): TLRichText {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'hi ' },
					...mentionIds.map((id) => ({ type: 'mention', attrs: { id, label: id } })),
				],
			},
		],
	} as unknown as TLRichText
}

function thread(createdBy: string): TLCommentThread {
	return {
		id: THREAD,
		typeName: 'comment-thread',
		pageId: PAGE,
		anchor: { type: 'point', x: 0, y: 0 },
		createdBy,
		createdAt: 0,
		resolved: null,
		isDeleted: false,
		meta: {},
	}
}

function comment(id: string, authorId: string, createdAt: number, mentions?: string[]): TLComment {
	return {
		id: `comment:${id}` as TLCommentId,
		typeName: 'comment',
		threadId: THREAD,
		pageId: PAGE,
		authorId,
		createdAt,
		editedAt: null,
		body: body(mentions),
		isDeleted: false,
		meta: {},
	}
}

function reaction(commentId: string, userId: string, createdAt: number): TLCommentReaction {
	const id = `comment:${commentId}` as TLCommentId
	return {
		id: createCommentReactionId(id, userId, '👍'),
		typeName: 'comment-reaction',
		commentId: id,
		threadId: THREAD,
		pageId: PAGE,
		userId,
		emoji: '👍',
		createdAt,
		meta: {},
	}
}

const summarize = (ns: ReturnType<typeof buildStoreCommentNotifications>) =>
	ns.map((n) => ({ id: n.comment.id, reason: n.primaryReason, unread: n.unread }))

describe('buildStoreCommentNotifications', () => {
	it('reads replies, mentions, and reactions from store records', () => {
		const result = buildStoreCommentNotifications(
			{
				threads: [thread(OTHER)],
				comments: [
					comment('opener', OTHER, 1),
					comment('mine', ME, 2),
					comment('reply', OTHER, 3),
					comment('ping', OTHER, 4, [ME]),
				],
				reactions: [reaction('mine', OTHER, 5), reaction('mine', ME, 6)],
			},
			ME
		)
		expect(summarize(result)).toEqual([
			{ id: 'comment:mine', reason: 'reaction', unread: true },
			{ id: 'comment:ping', reason: 'mention', unread: true },
			{ id: 'comment:reply', reason: 'reply', unread: true },
		])
	})

	it('uses ownsBoard for comments on the user’s own board', () => {
		const records = { threads: [thread(OTHER)], comments: [comment('a', OTHER, 1)], reactions: [] }
		expect(summarize(buildStoreCommentNotifications(records, ME))).toEqual([])
		expect(summarize(buildStoreCommentNotifications(records, ME, { ownsBoard: true }))).toEqual([
			{ id: 'comment:a', reason: 'owned-board', unread: true },
		])
	})

	it('takes read state from the host', () => {
		const records = {
			threads: [thread(ME)],
			comments: [comment('read', OTHER, 1), comment('new', OTHER, 2)],
			reactions: [],
		}
		expect(
			summarize(
				buildStoreCommentNotifications(records, ME, {
					isCommentUnread: (id) => id !== 'comment:read',
				})
			)
		).toEqual([
			{ id: 'comment:new', reason: 'reply', unread: true },
			{ id: 'comment:read', reason: 'reply', unread: false },
		])
	})

	it('keeps only mentions from a muted thread', () => {
		const result = buildStoreCommentNotifications(
			{
				threads: [thread(ME)],
				comments: [
					comment('mine', ME, 1),
					comment('reply', OTHER, 2),
					comment('ping', OTHER, 3, [ME]),
				],
				reactions: [reaction('mine', OTHER, 4)],
			},
			ME,
			{ ownsBoard: true, isThreadMuted: (id) => id === THREAD }
		)
		expect(result.map((n) => ({ id: n.comment.id, reasons: n.reasons }))).toEqual([
			{ id: 'comment:ping', reasons: ['mention'] },
		])
	})

	it('skips comments whose thread is gone', () => {
		expect(
			buildStoreCommentNotifications(
				{ threads: [], comments: [comment('a', OTHER, 1, [ME])], reactions: [] },
				ME
			)
		).toEqual([])
	})
})
