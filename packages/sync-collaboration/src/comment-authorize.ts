import type { Authorize, AuthorizeContext, UnknownRecord } from '@tldraw/store'
import {
	createCommentReactionId,
	type TLComment,
	type TLCommentReaction,
	type TLCommentThread,
} from '@tldraw/tlschema'
import { isEqual } from '@tldraw/utils'

/**
 * Options for {@link createCommentAuthorize}.
 *
 * @public
 */
export interface CommentAuthorizeOptions<Actor> {
	/**
	 * The user id of an actor (on the server, a session's `meta`). Return `null` for anonymous
	 * actors: they cannot create comment records, and own none.
	 */
	getUserId(actor: Actor): string | null
}

/**
 * The named actions that the comment rules ask, so that a host can widen or narrow them in its
 * own `authorize` function, and the comment UI can ask the same questions:
 *
 * - `comments:write` (no record): may the actor comment at all? The comment rules allow it for
 *   any actor with a user id. A host denies it, for example, for a view-only link.
 * - `comments:edit` (a comment): may the actor change this comment's body? The comment rules
 *   allow it for the author. A host allows it for others, or denies it for everyone.
 * - `comments:delete` (a comment or a thread): may the actor delete it? The comment rules allow
 *   it for the author of a comment and the creator of a thread. A host allows it for a
 *   moderator.
 *
 * A custom action that no rule allows is denied, so the comment rules only need to say `true`
 * for owners. The host's `true` widens, and the host's `false` wins.
 *
 * @public
 */
export type CommentAction = 'comments:write' | 'comments:edit' | 'comments:delete'

type CommentRecord = TLComment | TLCommentThread | TLCommentReaction
type Write<Rec> =
	| { type: 'create'; prev: null; next: Rec }
	| { type: 'update'; prev: Rec; next: Rec }
	| { type: 'delete'; prev: Rec; next: null }
/** A structural rule: the record to store, or `null` to deny. */
type Rule<Rec> = (userId: string | null, write: Write<Rec>) => Rec | null

/**
 * The comment rules as one `authorize` function, for both the sync server and the editor. Combine
 * it with the host's own function with `combineAuthorize`. It forces authorship from the actor so
 * nothing can be posted, resolved, or deleted in someone else's name:
 *
 * - `comment`: `authorId` is stamped on create (anonymous creates denied) and immutable after.
 *   An edit asks `comments:edit`. `threadId` and `createdAt` are immutable.
 * - `comment-thread`: `createdBy` and `createdAt` are fixed on create. Anyone who may comment may
 *   resolve or reopen, but a non-null `resolved.by` must be the actor's own user.
 * - `comment-reaction`: `userId` is stamped and immutable, a create must use the canonical id for
 *   its (comment, user, emoji) triple, and only the reactor may delete their own.
 * - Deletion is soft for comments and threads: a write-once `isDeleted` flag, never set at
 *   create, and it asks `comments:delete`. Client hard deletes are denied.
 * - Every write asks `comments:write` first.
 *
 * It answers the named actions in {@link CommentAction}, and abstains on reads and on other
 * record types. A soft delete that also changes other fields asks both `comments:delete` and
 * `comments:edit`, so a host that grants deletes alone cannot be talked into an edit.
 *
 * @example
 * ```ts
 * const authorize = combineAuthorize<MyRecord, SessionMeta>(
 * 	// moderators may take anything down; editing stays the author's
 * 	(ctx) => (ctx.action === 'comments:delete' && ctx.actor.isModerator ? true : undefined),
 * 	createCommentAuthorize({ getUserId: (meta) => meta.userId })
 * )
 * new TLSocketRoom<MyRecord, SessionMeta>({ authorize })
 * ```
 *
 * @public
 */
export function createCommentAuthorize<R extends UnknownRecord, Actor>(
	opts: CommentAuthorizeOptions<Actor>
): Authorize<R, Actor> {
	const { getUserId } = opts

	/**
	 * A record whose attribution lives in `field`: stamped from the actor on create, immutable on
	 * update. With `ownerOnlyUpdate`, only the author may update it at all.
	 */
	function authored<Rec extends UnknownRecord>(
		field: keyof Rec & string,
		{ ownerOnlyUpdate = false } = {}
	): Rule<Rec> {
		return (userId, { type, prev, next }) => {
			if (type === 'create') {
				if (!userId) return null // no identity to attribute
				return { ...next, [field]: userId } as Rec
			}
			if (type === 'update') {
				if (next[field] !== prev[field]) return null // attribution is immutable
				if (ownerOnlyUpdate && userId !== prev[field]) return null
				return next
			}
			return prev
		}
	}

	/**
	 * A soft-deleted record type on top of `base`. `isDeleted` is write-once, never set at create,
	 * and clients never hard delete. Flipping `isDeleted` asks `comments:delete`; a change to
	 * anything else asks `comments:edit` when `editable`.
	 */
	function softDeleted<Rec extends UnknownRecord & { isDeleted: boolean }>(
		editable: boolean,
		base: Rule<Rec>,
		can: (action: CommentAction, record: Rec) => boolean
	): Rule<Rec> {
		return (userId, write) => {
			if (write.type === 'delete') return null
			const result = base(userId, write)
			if (!result) return null
			// A record cannot be born deleted: that would skip the update checks.
			if (write.type === 'create') return write.next.isDeleted ? null : result

			const { prev, next } = write
			const isEdit = !isEqual({ ...next, isDeleted: prev.isDeleted }, prev)
			if (prev.isDeleted !== next.isDeleted) {
				if (prev.isDeleted) return null // write-once
				if (!can('comments:delete', prev)) return null
			}
			if (isEdit && editable && !can('comments:edit', prev)) return null
			return result
		}
	}

	/** A non-null `resolved.by` must be the actor's own user. */
	const threadResolution: Rule<TLCommentThread> = (userId, write) => {
		const result = authored<TLCommentThread>('createdBy')(userId, write)
		if (!result) return null
		if (write.type === 'create') {
			// Delete and re-put could otherwise carry a resolution forged in someone else's name.
			if (write.next.resolved && write.next.resolved.by !== userId) return null
		}
		if (write.type === 'update') {
			const { prev, next } = write
			const changed =
				prev.resolved?.at !== next.resolved?.at || prev.resolved?.by !== next.resolved?.by
			if (changed && next.resolved && next.resolved.by !== userId) return null
		}
		return result
	}

	/**
	 * Deny an update that changes any of `fields`. A mutable `threadId` would let an author move a
	 * comment between conversations; a mutable `createdAt` would let it be re-sorted.
	 */
	function immutable<Rec extends UnknownRecord>(
		fields: readonly (keyof Rec & string)[],
		base: Rule<Rec>
	): Rule<Rec> {
		return (userId, write) => {
			if (write.type === 'update') {
				for (const field of fields) {
					if (write.next[field] !== write.prev[field]) return null
				}
			}
			return base(userId, write)
		}
	}

	const reactionBase = authored<TLCommentReaction>('userId', { ownerOnlyUpdate: true })

	/**
	 * A reaction's id comes from its (comment, user, emoji) triple. On create the id must be
	 * canonical for the actor; on update everything that feeds the id is immutable.
	 */
	const reaction: Rule<TLCommentReaction> = (userId, write) => {
		// Only the reactor may remove their own reaction. Cascades still sweep every reactor's
		// records, because server-initiated writes skip `authorize`.
		if (write.type === 'delete') return userId && userId === write.prev.userId ? write.prev : null
		const result = reactionBase(userId, write)
		if (!result) return null
		if (write.type === 'create') {
			if (!userId) return null
			const { next } = write
			if (next.id !== createCommentReactionId(next.commentId, userId, next.emoji)) return null
		}
		if (write.type === 'update') {
			const { prev, next } = write
			if (next.commentId !== prev.commentId) return null
			if (next.threadId !== prev.threadId) return null
			if (next.pageId !== prev.pageId) return null
			if (next.emoji !== prev.emoji) return null
		}
		return result
	}

	function ownerOf(record: CommentRecord): string | null {
		switch (record.typeName) {
			case 'comment':
				return record.authorId
			case 'comment-thread':
				return record.createdBy
			default:
				return null
		}
	}

	return (ctx) => {
		const record = ctx.record as UnknownRecord | undefined

		// The named actions. Only owners get a `true` here; anyone else depends on the host.
		if (ctx.action === 'comments:write') return getUserId(ctx.actor) !== null || undefined
		if (ctx.action === 'comments:edit' || ctx.action === 'comments:delete') {
			if (!record || !isCommentRecord(record)) return undefined
			const userId = getUserId(ctx.actor)
			if (ctx.action === 'comments:edit' && record.typeName !== 'comment') return undefined
			return (userId !== null && userId === ownerOf(record)) || undefined
		}

		if (!record || !isCommentRecord(record)) return undefined
		if (ctx.action !== 'create' && ctx.action !== 'update' && ctx.action !== 'delete') {
			return undefined
		}
		const userId = getUserId(ctx.actor)
		if (!ctx.can('comments:write')) return { deny: 'You cannot comment here' }
		const can = (action: CommentAction, rec: UnknownRecord) => ctx.can(action, rec as R)

		// A pre-check ("may I change this at all?") asks the named actions directly.
		if (ctx.action === 'update' && !ctx.next) {
			if (record.typeName === 'comment') return can('comments:edit', record)
			if (record.typeName === 'comment-reaction') return userId === record.userId
			return true
		}

		const write = toWrite(ctx as AuthorizeContext<UnknownRecord, Actor>)
		let result: UnknownRecord | null
		switch (record.typeName) {
			case 'comment':
				result = softDeleted<TLComment>(
					true,
					// `pageId` stays mutable: it is copied from the thread, and moving a thread between
					// pages rewrites it on every comment.
					immutable<TLComment>(['threadId', 'createdAt'], authored<TLComment>('authorId')),
					can
				)(userId, write as Write<TLComment>)
				break
			case 'comment-thread':
				// Resolving and reopening stay open to anyone who may comment, so a thread is never
				// asked about edits, only about its delete.
				result = softDeleted<TLCommentThread>(
					false,
					immutable<TLCommentThread>(['createdAt'], threadResolution),
					can
				)(userId, write as Write<TLCommentThread>)
				break
			case 'comment-reaction':
				result = reaction(userId, write as Write<TLCommentReaction>)
				break
		}
		if (!result) return false
		return write.type === 'create' ? { record: result as R } : true
	}
}

function isCommentRecord(record: UnknownRecord): record is CommentRecord {
	return (
		record.typeName === 'comment' ||
		record.typeName === 'comment-thread' ||
		record.typeName === 'comment-reaction'
	)
}

function toWrite<Actor>(ctx: AuthorizeContext<UnknownRecord, Actor>): Write<UnknownRecord> {
	switch (ctx.action) {
		case 'create':
			return { type: 'create', prev: null, next: ctx.record }
		case 'update':
			return { type: 'update', prev: ctx.record, next: ctx.next! }
		default:
			return { type: 'delete', prev: ctx.record!, next: null }
	}
}
