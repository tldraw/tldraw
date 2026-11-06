import {
	TLAccess,
	TLComment,
	TLCommentReaction,
	TLCommentThread,
	TLPageId,
	TLRecord,
	createComment,
	createCommentId,
	createCommentReaction,
	createCommentReactionId,
	createCommentThread,
	createTransaction,
	defaultAbilityRules,
	definePermissions,
	toRichText,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { CommentRuleOptions, commentRules, stampCommentAuthors } from './comment-rules'

type AnyComment = TLComment | TLCommentThread | TLCommentReaction
interface Write {
	session: TLAccess
	type: 'create' | 'update' | 'delete'
	prev: AnyComment | null
	next: AnyComment | null
}

/**
 * Check one write against the rules, as the room checks a push of it. Returns the record the
 * write leaves (`next`, or `prev` for a delete) when it is allowed, and null when it is denied.
 */
function rulesFor(opts?: CommentRuleOptions) {
	const permissions = definePermissions<TLRecord>({
		rules: [...defaultAbilityRules(), ...commentRules(opts)],
	})
	const check = ({ session, type, prev, next }: Write) => {
		const id = (next ?? prev)!.id
		const verdict = permissions.check(
			createTransaction<TLRecord>({
				access: session,
				intent: null,
				diff: {
					added: type === 'create' ? { [id]: next } : {},
					updated: type === 'update' ? { [id]: [prev, next] } : {},
					removed: type === 'delete' ? { [id]: prev } : {},
				} as any,
				after: { get: () => undefined, all: () => [] },
			})
		)
		return verdict.ok ? (next ?? prev) : null
	}
	return { comment: check, 'comment-thread': check, 'comment-reaction': check }
}

const authorizers = rulesFor()

const pageId = 'page:test' as TLPageId
const thread = createCommentThread({
	pageId,
	anchor: { type: 'page' },
	createdBy: 'client-claims-alice',
})

/** A commenter's access. `canvasReadonly` drops the `comment` ability, as a viewer link would. */
function session(userId: string | null, canvasReadonly = false): TLAccess {
	return { userId, abilities: canvasReadonly ? [] : ['edit', 'comment'] }
}

describe('commentRules', () => {
	describe('comment', () => {
		const authorize = authorizers.comment!
		const comment = (authorId: string) =>
			createComment({ threadId: thread.id, pageId, authorId, body: toRichText('hi') })

		it('denies a create attributed to someone else', () => {
			expect(
				authorize({
					session: session('real-bob'),
					type: 'create',
					prev: null,
					next: comment('client-claims-alice'),
				})
			).toBeNull()
			const own = comment('real-bob')
			expect(
				authorize({ session: session('real-bob'), type: 'create', prev: null, next: own })
			).toBe(own)
		})

		it('has a client stamp that attributes new comments to the session', () => {
			const stamped = stampCommentAuthors<TLRecord>()(
				comment('client-claims-alice') as any,
				session('real-bob')
			) as unknown as TLComment
			expect(stamped.authorId).toBe('real-bob')
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
		const authorize = authorizers['comment-thread']!
		const makeThread = (createdBy: string) =>
			createCommentThread({ pageId, anchor: { type: 'page' }, createdBy })

		it('denies a create attributed to someone else', () => {
			expect(
				authorize({
					session: session('real-bob'),
					type: 'create',
					prev: null,
					next: makeThread('client-claims-alice'),
				})
			).toBeNull()
			const stamped = stampCommentAuthors<TLRecord>()(
				makeThread('client-claims-alice') as any,
				session('real-bob')
			) as unknown as TLCommentThread
			expect(
				authorize({ session: session('real-bob'), type: 'create', prev: null, next: stamped })
			).toBe(stamped)
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
			}) as unknown as TLCommentThread
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
		const authorize = authorizers['comment-reaction']!
		const makeReaction = (userId: string, emoji = '👍') =>
			createCommentReaction({
				commentId: createCommentId('c1'),
				threadId: thread.id,
				pageId,
				userId,
				emoji,
			})

		it('denies a create whose userId is someone else, even at the session user’s slot', () => {
			const next: TLCommentReaction = { ...makeReaction('real-bob'), userId: 'client-claims-alice' }
			expect(
				authorize({ session: session('real-bob'), type: 'create', prev: null, next })
			).toBeNull()
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

	describe('the comment ability', () => {
		const comment = (authorId: string) =>
			createComment({ threadId: thread.id, pageId, authorId, body: toRichText('hi') })
		const makeThread = (createdBy: string) =>
			createCommentThread({ pageId, anchor: { type: 'page' }, createdBy })
		const makeReaction = (userId: string, emoji = '👍') =>
			createCommentReaction({
				commentId: createCommentId('c1'),
				threadId: thread.id,
				pageId,
				userId,
				emoji,
			})

		it('denies every comment-record write from a session without it', () => {
			const readonly = session('real-bob', true)

			const commentPrev = comment('real-bob')
			expect(
				authorizers.comment!({
					session: readonly,
					type: 'create',
					prev: null,
					next: comment('real-bob'),
				})
			).toBeNull()
			expect(
				authorizers.comment!({
					session: readonly,
					type: 'update',
					prev: commentPrev,
					next: { ...commentPrev, body: toRichText('edited') },
				})
			).toBeNull()
			expect(
				authorizers.comment!({ session: readonly, type: 'delete', prev: commentPrev, next: null })
			).toBeNull()

			const threadPrev = makeThread('real-bob')
			expect(
				authorizers['comment-thread']!({
					session: readonly,
					type: 'create',
					prev: null,
					next: makeThread('real-bob'),
				})
			).toBeNull()
			expect(
				authorizers['comment-thread']!({
					session: readonly,
					type: 'update',
					prev: threadPrev,
					next: { ...threadPrev, resolved: { at: 1, by: 'real-bob' } },
				})
			).toBeNull()
			expect(
				authorizers['comment-thread']!({
					session: readonly,
					type: 'delete',
					prev: threadPrev,
					next: null,
				})
			).toBeNull()

			const reactionPrev = makeReaction('real-bob')
			expect(
				authorizers['comment-reaction']!({
					session: readonly,
					type: 'create',
					prev: null,
					next: makeReaction('real-bob'),
				})
			).toBeNull()
			expect(
				authorizers['comment-reaction']!({
					session: readonly,
					type: 'update',
					prev: reactionPrev,
					next: { ...reactionPrev, createdAt: reactionPrev.createdAt + 1 },
				})
			).toBeNull()
			expect(
				authorizers['comment-reaction']!({
					session: readonly,
					type: 'delete',
					prev: reactionPrev,
					next: null,
				})
			).toBeNull()
		})

		it('lets a comment-only session comment, as itself', () => {
			const commenter = { userId: 'real-bob', abilities: ['comment'] }
			expect(
				authorizers.comment!({
					session: commenter,
					type: 'create',
					prev: null,
					next: comment('real-bob'),
				})
			).not.toBeNull()
			expect(
				authorizers.comment!({
					session: { userId: null, abilities: ['comment'] },
					type: 'create',
					prev: null,
					next: comment('anon'),
				})
			).toBeNull()
		})
	})

	// The default is the owner-only rule the per-type suites above already cover in full. These
	// exercise the option itself: what a callback can widen, and what stays fixed underneath it.
	describe('canModifyComment', () => {
		const comment = (authorId: string) =>
			createComment({ threadId: thread.id, pageId, authorId, body: toRichText('hi') })
		const makeThread = (createdBy: string) =>
			createCommentThread({ pageId, anchor: { type: 'page' }, createdBy })

		// The motivating case: a moderator takes down someone else's comment, but takes over
		// nobody's voice — editing stays the author's.
		const moderated = rulesFor({
			canModifyComment: (ctx) =>
				(ctx.action !== 'edit-comment' && ctx.userId === 'real-mod') || ctx.userId === ctx.ownerId,
		})

		it('lets a widened rule soft-delete another user’s comment', () => {
			const prev = comment('real-bob')
			const next = { ...prev, isDeleted: true }
			expect(moderated.comment!({ session: session('real-mod'), type: 'update', prev, next })).toBe(
				next
			)
		})

		it('lets a widened rule soft-delete another user’s thread', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, isDeleted: true }
			expect(
				moderated['comment-thread']!({ session: session('real-mod'), type: 'update', prev, next })
			).toBe(next)
		})

		it('keeps the edit and the delete separate: widening deletes grants no edits', () => {
			const prev = comment('real-bob')
			const next = { ...prev, body: toRichText('rewritten by the mod') }
			expect(
				moderated.comment!({ session: session('real-mod'), type: 'update', prev, next })
			).toBeNull()
		})

		// The gap a delete-only permission would otherwise leave: flip the flag, rewrite the body,
		// and the edit rides in on a write the delete gate allowed.
		it('vetoes a delete that carries an edit past a delete-only permission', () => {
			const prev = comment('real-bob')
			const next = { ...prev, isDeleted: true, body: toRichText('rewritten on the way out') }
			expect(
				moderated.comment!({ session: session('real-mod'), type: 'update', prev, next })
			).toBeNull()
		})

		it('still lets the owner delete and edit in one write', () => {
			const prev = comment('real-bob')
			const next = { ...prev, isDeleted: true, body: toRichText('last word') }
			expect(moderated.comment!({ session: session('real-bob'), type: 'update', prev, next })).toBe(
				next
			)
		})

		it('leaves everyone else where the default left them', () => {
			const prev = comment('real-bob')
			expect(
				moderated.comment!({
					session: session('real-mallory'),
					type: 'update',
					prev,
					next: { ...prev, isDeleted: true },
				})
			).toBeNull()
			const threadPrev = makeThread('real-bob')
			expect(
				moderated['comment-thread']!({
					session: session('real-mallory'),
					type: 'update',
					prev: threadPrev,
					next: { ...threadPrev, isDeleted: true },
				})
			).toBeNull()
		})

		it('narrows as well as widens', () => {
			const frozen = rulesFor({
				canModifyComment: (ctx) => ctx.action !== 'edit-comment' && ctx.userId === ctx.ownerId,
			})
			const prev = comment('real-bob')
			expect(
				frozen.comment!({
					session: session('real-bob'),
					type: 'update',
					prev,
					next: { ...prev, body: toRichText('edited') },
				})
			).toBeNull()
			// ...and the delete it didn't narrow still goes through
			const deleted = { ...prev, isDeleted: true }
			expect(
				frozen.comment!({ session: session('real-bob'), type: 'update', prev, next: deleted })
			).toBe(deleted)
		})

		it('is asked with the stored record, not the client’s version of it', () => {
			const seen: unknown[] = []
			const spying = rulesFor({
				canModifyComment: (ctx) => {
					seen.push(ctx)
					return true
				},
			})
			const prev = comment('real-bob')
			// mallory's push claims the comment is hers and already deleted; the context must describe
			// the record the room holds, or an ownership rule would be reading the attacker's claim
			const next = { ...prev, authorId: 'real-mallory', body: toRichText('edited') }
			spying.comment!({ session: session('real-mallory'), type: 'update', prev, next })
			// the attribution guard rejects this one before the option is asked at all
			expect(seen).toEqual([])

			spying.comment!({
				session: session('real-mallory'),
				type: 'update',
				prev,
				next: { ...prev, body: toRichText('edited') },
			})
			expect(seen).toEqual([
				{
					access: session('real-mallory'),
					can: expect.any(Function),
					userId: 'real-mallory',
					ownerId: 'real-bob',
					action: 'edit-comment',
					comment: prev,
				},
			])
		})

		it('reports the thread’s creator as the owner of a thread delete', () => {
			const seen: unknown[] = []
			const spying = rulesFor({
				canModifyComment: (ctx) => {
					seen.push(ctx)
					return true
				},
			})
			const prev = makeThread('real-bob')
			spying['comment-thread']!({
				session: session('real-mallory'),
				type: 'update',
				prev,
				next: { ...prev, isDeleted: true },
			})
			expect(seen).toEqual([
				{
					access: session('real-mallory'),
					can: expect.any(Function),
					userId: 'real-mallory',
					ownerId: 'real-bob',
					action: 'delete-thread',
					thread: prev,
				},
			])
		})

		// Resolving and reopening aren't anyone's in particular, matching the client option: they're
		// `canComment`'s to gate, and the option is never asked about them.
		it('is not asked about resolving or reopening a thread', () => {
			let asked = 0
			const counting = rulesFor({
				canModifyComment: () => {
					asked++
					return true
				},
			})
			const prev = makeThread('real-bob')
			const resolved = { ...prev, resolved: { at: 1, by: 'real-mallory' } }
			expect(
				counting['comment-thread']!({
					session: session('real-mallory'),
					type: 'update',
					prev,
					next: resolved,
				})
			).toBe(resolved)
			const reopened = { ...resolved, resolved: null }
			expect(
				counting['comment-thread']!({
					session: session('real-mallory'),
					type: 'update',
					prev: resolved,
					next: reopened,
				})
			).toBe(reopened)
			expect(asked).toBe(0)
		})

		it('is not asked about reactions', () => {
			let asked = 0
			const counting = rulesFor({
				canModifyComment: () => {
					asked++
					return true
				},
			})
			const prev = createCommentReaction({
				commentId: createCommentId('c1'),
				threadId: thread.id,
				pageId,
				userId: 'real-bob',
				emoji: '👍',
			})
			// a permissive callback doesn't hand mallory someone else's reaction
			expect(
				counting['comment-reaction']!({
					session: session('real-mallory'),
					type: 'delete',
					prev,
					next: null,
				})
			).toBeNull()
			expect(
				counting['comment-reaction']!({
					session: session('real-bob'),
					type: 'update',
					prev,
					next: { ...prev, createdAt: prev.createdAt + 1 },
				})
			).not.toBeNull()
			expect(asked).toBe(0)
		})

		// The point of asking after the structural rules: a host can hand out these three writes
		// without handing out the invariants underneath them.
		describe('the structural rules hold however permissive the callback', () => {
			const permissive = rulesFor({
				canModifyComment: () => true,
			})

			it('still vetoes clearing a soft-delete', () => {
				const prev = { ...comment('real-bob'), isDeleted: true }
				expect(
					permissive.comment!({
						session: session('real-mod'),
						type: 'update',
						prev,
						next: { ...prev, isDeleted: false },
					})
				).toBeNull()
			})

			it('still vetoes every client hard-delete', () => {
				const prev = comment('real-bob')
				expect(
					permissive.comment!({ session: session('real-mod'), type: 'delete', prev, next: null })
				).toBeNull()
				const threadPrev = makeThread('real-bob')
				expect(
					permissive['comment-thread']!({
						session: session('real-mod'),
						type: 'delete',
						prev: threadPrev,
						next: null,
					})
				).toBeNull()
			})

			it('still vetoes changing a comment’s author', () => {
				const prev = comment('real-bob')
				expect(
					permissive.comment!({
						session: session('real-mod'),
						type: 'update',
						prev,
						next: { ...prev, authorId: 'real-mod' },
					})
				).toBeNull()
			})

			it('still vetoes re-parenting and back-dating a comment', () => {
				const prev = comment('real-bob')
				expect(
					permissive.comment!({
						session: session('real-mod'),
						type: 'update',
						prev,
						next: { ...prev, threadId: 'comment-thread:other' as TLCommentThread['id'] },
					})
				).toBeNull()
				expect(
					permissive.comment!({
						session: session('real-mod'),
						type: 'update',
						prev,
						next: { ...prev, createdAt: 1 },
					})
				).toBeNull()
			})

			it('still vetoes a create with the soft-delete flag already set', () => {
				expect(
					permissive.comment!({
						session: session('real-mod'),
						type: 'create',
						prev: null,
						next: { ...comment('real-mod'), isDeleted: true },
					})
				).toBeNull()
			})

			it('still vetoes a resolution attributed to someone else', () => {
				const prev = makeThread('real-bob')
				expect(
					permissive['comment-thread']!({
						session: session('real-mod'),
						type: 'update',
						prev,
						next: { ...prev, resolved: { at: 1, by: 'real-alice' } },
					})
				).toBeNull()
			})

			// An anonymous session has no identity to check a record against, so the default withholds
			// all three writes from it. A callback that returns true regardless is taken at its word —
			// worth knowing before writing one that ignores `userId`.
			it('takes a callback at its word about an anonymous session', () => {
				const prev = comment('real-bob')
				const next = { ...prev, isDeleted: true }
				expect(permissive.comment!({ session: session(null), type: 'update', prev, next })).toBe(
					next
				)
				expect(
					authorizers.comment!({ session: session(null), type: 'update', prev, next })
				).toBeNull()
			})
		})
	})
})
