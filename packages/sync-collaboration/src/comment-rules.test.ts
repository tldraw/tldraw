import {
	TLRuleRecord,
	TLRulesFragment,
	commentRules,
	compileRules,
	composeRules,
} from '@tldraw/rules'
/**
 * The comment authorizer tests from `@tldraw/sync-collaboration`, run unchanged against
 * `commentRules`: the same rules as data instead of code. Only the setup differs. Cases that test
 * the callback API itself (how often `getUserId` runs, what `canModifyComment` is asked) have no
 * counterpart, because rules have no callbacks; the moderator cases are rewritten as `let`
 * overrides at the end.
 */
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

interface TestMeta {
	userId: string | null
}

interface Session {
	sessionId: string
	isReadonly: boolean
	meta: TestMeta
}
type Args<R> = { session: Session } & (
	| { type: 'create'; prev: null; next: R }
	| { type: 'update'; prev: R; next: R }
	| { type: 'delete'; prev: R; next: null }
)

/** The `authorizeRecord` shape, backed by rules. */
function rulesAuthorizers(...fragments: TLRulesFragment[]) {
	const rules = compileRules(
		composeRules(
			{ version: 1, default: { read: 'true', write: 'false' } },
			commentRules,
			...fragments
		)
	)
	const make =
		<R extends TLRuleRecord>(typeName: string) =>
		(args: Args<R>): R | null => {
			const result = rules.checkWrite<R>({
				op: args.type,
				typeName,
				prev: args.prev,
				next: args.next,
				user: {
					id: args.session.meta.userId,
					access: args.session.isReadonly ? 'view' : 'edit',
				},
				get: () => undefined,
			})
			return result.ok ? result.record : null
		}
	return {
		comment: make<TLComment>('comment'),
		'comment-thread': make<TLCommentThread>('comment-thread'),
		'comment-reaction': make<TLCommentReaction>('comment-reaction'),
	}
}

const authorizers = rulesAuthorizers()

const pageId = 'page:test' as TLPageId
const thread = createCommentThread({
	pageId,
	anchor: { type: 'page' },
	createdBy: 'client-claims-alice',
})

function session(userId: string | null, isReadonly = false): Session {
	return { sessionId: 's1', isReadonly, meta: { userId } }
}

describe('commentRules (ported createCommentAuthorizers tests)', () => {
	describe('comment', () => {
		const authorize = authorizers.comment
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
		const authorize = authorizers['comment-thread']
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
		const authorize = authorizers['comment-reaction']
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

	describe('read-only sessions', () => {
		it('blocks every comment write from a view-only user', () => {
			const readonly = session('real-bob', true)
			const comment = createComment({
				threadId: thread.id,
				pageId,
				authorId: 'real-bob',
				body: toRichText('hi'),
			})
			expect(
				authorizers.comment({ session: readonly, type: 'create', prev: null, next: comment })
			).toBeNull()
			expect(
				authorizers.comment({
					session: readonly,
					type: 'update',
					prev: comment,
					next: { ...comment, isDeleted: true },
				})
			).toBeNull()
		})

		it('lets a host allow comment-only users by redefining canComment', () => {
			const commentOnly = rulesAuthorizers({ let: { canComment: "user.access != 'none'" } })
			const comment = createComment({
				threadId: thread.id,
				pageId,
				authorId: 'real-bob',
				body: toRichText('hi'),
			})
			expect(
				commentOnly.comment({
					session: session('real-bob', true),
					type: 'create',
					prev: null,
					next: comment,
				})
			).not.toBeNull()
		})
	})

	describe('moderators (canModifyComment, as let overrides)', () => {
		const moderated = rulesAuthorizers({
			let: {
				isModerator: "user.id == 'real-mod'",
				mayDeleteComment: 'isModerator || prev.authorId == user.id',
				mayDeleteThread: 'isModerator || prev.createdBy == user.id',
			},
		})
		const comment = (authorId: string) =>
			createComment({ threadId: thread.id, pageId, authorId, body: toRichText('hi') })
		const makeThread = (createdBy: string) =>
			createCommentThread({ pageId, anchor: { type: 'page' }, createdBy })

		it('lets a widened rule soft-delete another user’s comment', () => {
			const prev = comment('real-bob')
			const next = { ...prev, isDeleted: true }
			expect(moderated.comment({ session: session('real-mod'), type: 'update', prev, next })).toBe(
				next
			)
		})

		it('lets a widened rule soft-delete another user’s thread', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, isDeleted: true }
			expect(
				moderated['comment-thread']({ session: session('real-mod'), type: 'update', prev, next })
			).toBe(next)
		})

		it('keeps the edit and the delete separate: widening deletes grants no edits', () => {
			const prev = comment('real-bob')
			const next = { ...prev, body: toRichText('rewritten by the mod') }
			expect(
				moderated.comment({ session: session('real-mod'), type: 'update', prev, next })
			).toBeNull()
		})

		it('vetoes a delete that carries an edit past a delete-only permission', () => {
			const prev = comment('real-bob')
			const next = { ...prev, isDeleted: true, body: toRichText('rewritten on the way out') }
			expect(
				moderated.comment({ session: session('real-mod'), type: 'update', prev, next })
			).toBeNull()
		})

		it('still lets the owner delete and edit in one write', () => {
			const prev = comment('real-bob')
			const next = { ...prev, isDeleted: true, body: toRichText('last word') }
			expect(moderated.comment({ session: session('real-bob'), type: 'update', prev, next })).toBe(
				next
			)
		})

		it('leaves everyone else where the default left them', () => {
			const prev = comment('real-bob')
			expect(
				moderated.comment({
					session: session('real-mallory'),
					type: 'update',
					prev,
					next: { ...prev, isDeleted: true },
				})
			).toBeNull()
		})
	})
})
