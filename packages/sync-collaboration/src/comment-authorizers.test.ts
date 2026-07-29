import type { UnknownRecord } from '@tldraw/store'
import type { TLRecordAuthorizer, TLRecordAuthorizerArgs } from '@tldraw/sync-core'
import {
	TLComment,
	TLCommentReaction,
	TLCommentThread,
	TLPageId,
	createComment,
	createCommentId,
	createCommentReaction,
	createCommentReactionId,
	createCommentThread,
	toRichText,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { createCommentAuthorizers } from './comment-authorizers'

interface TestMeta {
	userId: string | null
}

const authorizers = createCommentAuthorizers<TestMeta>({
	getUserId: (session) => session.meta.userId,
})

/** The `allow`/`deny` helpers the room hands to every authorizer. */
const helpers = {
	allow: (record?: any) =>
		record ? { allowed: true as const, record } : { allowed: true as const },
	deny: () => ({ allowed: false as const }),
}

/** The write to authorize, without the helpers the room supplies. */
type Write<Rec extends UnknownRecord> = Omit<
	TLRecordAuthorizerArgs<Rec, TestMeta>,
	'allow' | 'deny'
>

/**
 * Call an authorizer the way the room does, and flatten its verdict to the record that would be
 * stored, or `null` when denied — so each test reads as one write in, one outcome out.
 */
function authorizing<Rec extends UnknownRecord>(authorize: TLRecordAuthorizer<Rec, TestMeta>) {
	return (write: Write<Rec>): Rec | null => {
		const result = authorize({ ...write, ...helpers } as TLRecordAuthorizerArgs<Rec, TestMeta>)
		if (!result.allowed) return null
		// create: the stamped record, if the authorizer passed one; update/delete: allow/veto only
		return result.record ?? write.next ?? write.prev
	}
}

const pageId = 'page:test' as TLPageId
const thread = createCommentThread({
	pageId,
	anchor: { type: 'page' },
	createdBy: 'client-claims-alice',
})

function session(userId: string | null): { sessionId: string; meta: TestMeta } {
	return { sessionId: 's1', meta: { userId } }
}

describe('createCommentAuthorizers', () => {
	// getUserId is documented as called exactly once per write. More than once would let an
	// impure host callback split identity across checks — e.g. a reaction create where the
	// stamped userId and the canonical-id check disagree about who is reacting.
	it('resolves the session user exactly once per authorization', () => {
		let calls = 0
		const counted = createCommentAuthorizers<TestMeta>({
			getUserId: (s) => {
				calls++
				return s.meta.userId
			},
		})
		// the worst former offender: a thread update touching both resolution and the soft-delete flag
		const prev = createCommentThread({ pageId, anchor: { type: 'page' }, createdBy: 'real-bob' })
		const next = { ...prev, resolved: { at: 1, by: 'real-bob' }, isDeleted: true }
		expect(
			authorizing(counted['comment-thread']!)({
				session: session('real-bob'),
				type: 'update',
				prev,
				next,
			})
		).toBe(next)
		expect(calls).toBe(1)
	})

	// The rest of the suite flattens verdicts through `authorizing`; this pins the shape itself, so
	// a rule that returned a bare record (or nothing) would be caught here as well as by the compiler.
	it('returns a discriminated verdict, carrying the stamped record on create', () => {
		const authorize = authorizers.comment!
		const next = createComment({
			threadId: thread.id,
			pageId,
			authorId: 'client-claims-alice',
			body: toRichText('hi'),
		})
		expect(
			authorize({ ...helpers, session: session('real-bob'), type: 'create', prev: null, next })
		).toEqual({ allowed: true, record: { ...next, authorId: 'real-bob' } })
		expect(
			authorize({ ...helpers, session: session(null), type: 'create', prev: null, next })
		).toEqual({ allowed: false })
	})

	describe('comment', () => {
		const authorize = authorizing(authorizers.comment!)
		const comment = (authorId: string) =>
			createComment({ threadId: thread.id, pageId, authorId, body: toRichText('hi') })

		it('stamps authorId from the session on create, overriding the client value', () => {
			const result = authorize({
				session: session('real-bob'),
				type: 'create',
				prev: null,
				next: comment('client-claims-alice'),
			}) as TLComment
			expect(result.authorId).toBe('real-bob')
		})

		it('rejects a create with no authenticated user', () => {
			expect(
				authorize({ session: session(null), type: 'create', prev: null, next: comment('anon') })
			).toBeNull()
		})

		it('allows the author to edit their own comment', () => {
			const prev = comment('real-bob')
			const next = { ...prev, body: toRichText('edited') }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes an edit from someone who is not the author', () => {
			const prev = comment('real-bob')
			const next = { ...prev, body: toRichText('sneakily rewritten') }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes an update that changes the author', () => {
			const prev = comment('real-bob')
			const next = { ...prev, authorId: 'someone-else' }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes every client hard-delete, even from the author (deletion is soft)', () => {
			const prev = comment('real-bob')
			expect(
				authorize({ session: session('real-bob'), type: 'delete', prev, next: null })
			).toBeNull()
			expect(
				authorize({ session: session('real-mallory'), type: 'delete', prev, next: null })
			).toBeNull()
			expect(authorize({ session: session(null), type: 'delete', prev, next: null })).toBeNull()
		})

		it('lets the author soft-delete their own comment', () => {
			const prev = comment('real-bob')
			const next = { ...prev, isDeleted: true }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes a non-author soft-deleting the comment', () => {
			const prev = comment('real-bob')
			const next = { ...prev, isDeleted: true }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBeNull()
			expect(authorize({ session: session(null), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes clearing a soft-delete, even by the author (write-once)', () => {
			const prev = { ...comment('real-bob'), isDeleted: true }
			const next = { ...prev, isDeleted: false }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('allows an update that leaves an existing soft-delete untouched', () => {
			const prev = { ...comment('real-bob'), isDeleted: true }
			const next = { ...prev, body: toRichText('edited') }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes a create with the soft-delete flag already set', () => {
			const next = { ...comment('real-bob'), isDeleted: true }
			expect(
				authorize({ session: session('real-bob'), type: 'create', prev: null, next })
			).toBeNull()
		})

		// threadId ties a comment to its conversation (and downstream to a file), so re-parenting an
		// existing comment must not be an update — even by its own author.
		it('vetoes re-parenting a comment to another thread', () => {
			const prev = comment('real-bob')
			const next = { ...prev, threadId: 'comment-thread:other' as TLCommentThread['id'] }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		// createdAt orders threads and bounds the notification feed, so a mutable one lets a comment
		// be re-sorted (or pinned to the top of the feed) after the fact.
		it('vetoes back-dating a comment', () => {
			const prev = comment('real-bob')
			const next = { ...prev, createdAt: 1 }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		// the anchor lifecycle rewrites pageId on every comment when a thread moves pages
		it('allows a pageId update (threads can move between pages)', () => {
			const prev = comment('real-bob')
			const next = { ...prev, pageId: 'page:other' as TLPageId }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBe(next)
		})
	})

	describe('comment-thread', () => {
		const authorize = authorizing(authorizers['comment-thread']!)
		const makeThread = (createdBy: string) =>
			createCommentThread({ pageId, anchor: { type: 'page' }, createdBy })

		it('stamps createdBy from the session on create, overriding the client value', () => {
			const result = authorize({
				session: session('real-bob'),
				type: 'create',
				prev: null,
				next: makeThread('client-claims-alice'),
			}) as TLCommentThread
			expect(result.createdBy).toBe('real-bob')
		})

		it('vetoes an update that changes the creator', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, createdBy: 'someone-else' }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('lets a non-creator resolve the thread as themselves', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, resolved: { at: 1, by: 'real-mallory' } }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBe(next)
		})

		it('lets a non-creator reopen a resolved thread', () => {
			const prev = { ...makeThread('real-bob'), resolved: { at: 1, by: 'real-alice' } }
			const next = { ...prev, resolved: null }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes a resolution attributed to someone else', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, resolved: { at: 1, by: 'real-alice' } }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBeNull()
		})

		it('allows an update that leaves an existing resolution untouched', () => {
			const prev = { ...makeThread('real-bob'), resolved: { at: 1, by: 'real-alice' } }
			// new object reference, same value — must not be treated as a change
			const next = { ...prev, resolved: { ...prev.resolved } }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes a create with a resolution attributed to someone else', () => {
			const next = { ...makeThread('real-mallory'), resolved: { at: 1, by: 'real-alice' } }
			expect(
				authorize({ session: session('real-mallory'), type: 'create', prev: null, next })
			).toBeNull()
		})

		it('allows a create resolved by the creator themselves', () => {
			const next = { ...makeThread('real-bob'), resolved: { at: 1, by: 'real-bob' } }
			const result = authorize({
				session: session('real-bob'),
				type: 'create',
				prev: null,
				next,
			}) as TLCommentThread
			expect(result.resolved).toEqual({ at: 1, by: 'real-bob' })
		})

		it('vetoes every client hard-delete, even from the creator (deletion is soft)', () => {
			const prev = makeThread('real-bob')
			expect(
				authorize({ session: session('real-bob'), type: 'delete', prev, next: null })
			).toBeNull()
			expect(
				authorize({ session: session('real-mallory'), type: 'delete', prev, next: null })
			).toBeNull()
		})

		it('lets the creator soft-delete their own thread', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, isDeleted: true }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes a non-creator soft-deleting the thread', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, isDeleted: true }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBeNull()
			expect(authorize({ session: session(null), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes clearing a soft-delete, even by the creator (write-once)', () => {
			const prev = { ...makeThread('real-bob'), isDeleted: true }
			const next = { ...prev, isDeleted: false }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('allows an update that leaves an existing soft-delete untouched', () => {
			const prev = { ...makeThread('real-bob'), isDeleted: true }
			const next = { ...prev, resolved: { at: 2, by: 'real-mallory' } }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes a create with the soft-delete flag already set', () => {
			const next = { ...makeThread('real-bob'), isDeleted: true }
			expect(
				authorize({ session: session('real-bob'), type: 'create', prev: null, next })
			).toBeNull()
		})
	})

	// A reaction is one user's own record, so it needs no bespoke rule: the standard attribution
	// guards cover forging (userId is stamped from the session) and tampering (owner-only update).
	// Crucially there is no shared field, so one person's write can't reach another's reaction.
	describe('comment-reaction', () => {
		const authorize = authorizing(authorizers['comment-reaction']!)
		const makeReaction = (userId: string, emoji = '👍') =>
			createCommentReaction({
				commentId: createCommentId('c1'),
				threadId: thread.id,
				pageId,
				userId,
				emoji,
			})

		it('stamps userId from the session on create, overriding the client value', () => {
			// id is bob's canonical slot (so it passes the id check), but the userId field claims
			// someone else — the server stamps it back to the session user
			const next: TLCommentReaction = { ...makeReaction('real-bob'), userId: 'client-claims-alice' }
			const result = authorize({
				session: session('real-bob'),
				type: 'create',
				prev: null,
				next,
			}) as TLCommentReaction
			expect(result.userId).toBe('real-bob')
		})

		it('rejects a create from a session with no identity', () => {
			expect(
				authorize({
					session: session(null),
					type: 'create',
					prev: null,
					next: makeReaction('anyone'),
				})
			).toBeNull()
		})

		it('vetoes an update that changes the reacting user', () => {
			const prev = makeReaction('real-bob')
			const next = { ...prev, userId: 'real-alice' }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		// emoji feeds the id now, so switching emoji is a delete+create, never an update — an update
		// that changes emoji is rejected (its id would no longer match its emoji)
		it('vetoes an update that changes the emoji', () => {
			const prev = makeReaction('real-bob', '👍')
			const next = { ...prev, emoji: '🎉' }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes changing someone else’s reaction', () => {
			const prev = makeReaction('real-alice')
			const next = { ...prev, emoji: '💩' }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBeNull()
		})

		it('lets the reactor remove their own reaction', () => {
			const prev = makeReaction('real-bob')
			expect(authorize({ session: session('real-bob'), type: 'delete', prev, next: null })).toBe(
				prev
			)
		})

		it('vetoes deleting someone else’s reaction', () => {
			// cascades still sweep every reactor's records: server-initiated writes carry no session
			// and skip authorizers entirely, so this doesn't need to be open to clients
			const prev = makeReaction('real-alice')
			expect(
				authorize({ session: session('real-mallory'), type: 'delete', prev, next: null })
			).toBeNull()
			expect(authorize({ session: session(null), type: 'delete', prev, next: null })).toBeNull()
		})

		// The id is derived from (comment, user, emoji). A create must land at the session user's own
		// canonical slot, or a forger could occupy someone else's slot (locking them out) or push a
		// mismatched id that wedges the table's unique constraint at drain time.
		it('vetoes a create whose id is not the session user’s canonical slot', () => {
			// mallory forges a reaction at alice's id slot on the same comment + emoji
			const next: TLCommentReaction = {
				...makeReaction('real-mallory', '👍'),
				id: createCommentReactionId(createCommentId('c1'), 'real-alice', '👍'),
			}
			expect(
				authorize({ session: session('real-mallory'), type: 'create', prev: null, next })
			).toBeNull()
		})

		// the id also encodes the emoji, so an id that doesn't match the record's own emoji field
		// (e.g. id says 👍 but the field says 🎉) is a mismatch and rejected
		it('vetoes a create whose id emoji disagrees with its emoji field', () => {
			const next: TLCommentReaction = {
				...makeReaction('real-mallory', '🎉'),
				id: createCommentReactionId(createCommentId('c1'), 'real-mallory', '👍'),
			}
			expect(
				authorize({ session: session('real-mallory'), type: 'create', prev: null, next })
			).toBeNull()
		})

		it('allows a create whose id is the session user’s canonical slot', () => {
			const next = makeReaction('real-mallory')
			expect(
				authorize({ session: session('real-mallory'), type: 'create', prev: null, next })
			).not.toBeNull()
		})

		// the reaction's comment is fixed by its id; an update must not move it onto another comment,
		// or the id would disagree with commentId and two rows could collide on (commentId, userId)
		it('vetoes an update that moves the reaction to a different comment', () => {
			const prev = makeReaction('real-bob')
			const next = { ...prev, commentId: createCommentId('c2') }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes an update that changes the denormalized threadId or pageId', () => {
			const prev = makeReaction('real-bob')
			expect(
				authorize({
					session: session('real-bob'),
					type: 'update',
					prev,
					next: {
						...prev,
						threadId: createCommentThread({ pageId, anchor: { type: 'page' }, createdBy: 'x' }).id,
					},
				})
			).toBeNull()
			expect(
				authorize({
					session: session('real-bob'),
					type: 'update',
					prev,
					next: { ...prev, pageId: 'page:other' as typeof prev.pageId },
				})
			).toBeNull()
		})
	})
})
