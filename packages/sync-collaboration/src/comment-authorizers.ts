import type { UnknownRecord } from '@tldraw/store'
import {
	perRecord,
	type TLRecordAuthorizers,
	type TLRecordChange,
	type TLSyncRule,
	type TLSyncRuleSession,
} from '@tldraw/sync-core'
import {
	createCommentReactionId,
	isPageId,
	isShapeId,
	type TLComment,
	type TLCommentReaction,
	type TLCommentThread,
	type TLShape,
} from '@tldraw/tlschema'
import { isEqual } from '@tldraw/utils'

/**
 * A comment write that belongs to someone in particular, and the stored record it targets — the
 * argument to {@link CommentAuthorizerOptions.canModifyComment}, and the server-side mirror of
 * `CommentModification` in `@tldraw/commenting`.
 *
 * The record is the one the room holds, never the client's version of it: the incoming record is
 * the thing being authorized, so a rule that read it would be asking the writer who owns what
 * they're writing to.
 *
 * Resolving, reopening, and reacting aren't here, matching the client option: none of them is
 * anyone's in particular, so {@link CommentAuthorizerOptions.canComment} is the only gate on them.
 *
 * @public
 */
export type CommentModification =
	| { readonly action: 'edit-comment'; readonly comment: TLComment }
	| { readonly action: 'delete-comment'; readonly comment: TLComment }
	| { readonly action: 'delete-thread'; readonly thread: TLCommentThread }

/**
 * The argument to {@link CommentAuthorizerOptions.canModifyComment}: which write, against which
 * stored record, by which session.
 *
 * `ownerId` is that record's owner — a comment's `authorId`, a thread's `createdBy` — so a callback
 * widening the default doesn't have to know which field each record keeps it in.
 *
 * @deprecated Use {@link CommentModificationRuleContext} with {@link createCommentRule}.
 * @public
 */
export type CommentModificationAuthContext<SessionMeta> = {
	readonly session: { sessionId: string; isReadonly: boolean; meta: SessionMeta }
	readonly userId: string | null
	readonly ownerId: string
} & CommentModification

/**
 * The argument to {@link CommentRuleOptions.canModifyComment}: which write, against
 * which stored record, by which session. Same as {@link CommentModificationAuthContext} but the
 * session is what the room's `authorize` rule sees: `{ sessionId, meta }`.
 *
 * @public
 */
export type CommentModificationRuleContext<SessionMeta> = {
	readonly session: TLSyncRuleSession<SessionMeta>
	readonly userId: string | null
	readonly ownerId: string
} & CommentModification

/** What the deprecated per-type map sees of a session. */
interface LegacySession<SessionMeta> {
	sessionId: string
	isReadonly: boolean
	meta: SessionMeta
}

type CommentModificationContext<S> = {
	readonly session: S
	readonly userId: string | null
	readonly ownerId: string
} & CommentModification

type CommentRuleArgs<S, Rec extends UnknownRecord> = { session: S } & TLRecordChange<Rec>
type CommentRule<S, Rec extends UnknownRecord> = (args: CommentRuleArgs<S, Rec>) => Rec | null
interface CommentRules<S> {
	comment: CommentRule<S, TLComment>
	'comment-thread': CommentRule<S, TLCommentThread>
	'comment-reaction': CommentRule<S, TLCommentReaction>
}

/**
 * The record types the comment rules judge; every other record passes through untouched.
 *
 * @public
 */
export type TLCommentRecord = TLComment | TLCommentThread | TLCommentReaction

/**
 * Whether a record is one the comment rules judge: a thread, a comment, or a reaction.
 *
 * @public
 */
export function isCommentRecord(record: UnknownRecord): record is TLCommentRecord {
	return (
		record.typeName === 'comment' ||
		record.typeName === 'comment-thread' ||
		record.typeName === 'comment-reaction'
	)
}

/**
 * Options for {@link createCommentAuthorizers}.
 *
 * @deprecated Use {@link CommentRuleOptions} with {@link createCommentRule}.
 * @public
 */
export interface CommentAuthorizerOptions<SessionMeta> {
	/**
	 * Resolve the authenticated user id for a session from its host-provided `meta`. Return `null`
	 * for anonymous sessions — they can't create records, and own none, so the default
	 * {@link CommentAuthorizerOptions.canModifyComment} grants them no edits or deletes either.
	 */
	getUserId(session: { sessionId: string; isReadonly: boolean; meta: SessionMeta }): string | null

	/**
	 * Whether a session may write comment records at all — checked before the per-type rules.
	 * Defaults to `({ isReadonly }) => !isReadonly`, so read-only viewers can read threads but not
	 * post. Override to decouple the lanes: `() => true` allows commenting on a read-only canvas.
	 */
	canComment?(session: { sessionId: string; isReadonly: boolean; meta: SessionMeta }): boolean

	/**
	 * Whether a session may make a particular write against a particular stored record: editing or
	 * deleting a comment, or deleting a thread. Defaults to
	 * `({ userId, ownerId }) => userId === ownerId` — the owner-only rule enforced up to now.
	 * Override to widen it (a workspace admin or moderator who may take down anyone's comment) or
	 * to narrow it (no edits after an hour).
	 *
	 * The counterpart to `canModifyComment` in `@tldraw/commenting`, which decides which
	 * affordances the UI offers. This one is the real rule, and the two want widening together: a
	 * delete the client offers and this rejects is applied locally, vetoed, and rebased away — the
	 * comment comes back with nothing to explain it.
	 *
	 * Asked after {@link CommentAuthorizerOptions.canComment} and after the structural rules, so it
	 * can only widen *who* may write, never *what* a write may contain. However permissive the
	 * callback, attribution still comes from the session (stamped by this map, checked by
	 * {@link createCommentRule}) and is immutable, `isDeleted` is still
	 * write-once and never set at create, `threadId` and `createdAt` are still frozen, a
	 * resolution is still the resolver's own, and clients still can't hard-delete.
	 *
	 * A soft delete that changes anything besides the flag is asked about twice — once as the
	 * delete, once as an edit — so granting deletes alone can't be talked into an edit.
	 *
	 * Called at most once per authorized write, twice for that combined case.
	 *
	 * @example
	 * ```ts
	 * createCommentAuthorizers<SessionMeta>({
	 * 	getUserId: (session) => session.meta.userId,
	 * 	// Moderators may take anything down. Editing stays the author's, whoever you are.
	 * 	canModifyComment: (ctx) =>
	 * 		(ctx.action !== 'edit-comment' && isModerator(ctx.session.meta)) ||
	 * 		ctx.userId === ctx.ownerId,
	 * })
	 * ```
	 */
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	canModifyComment?(ctx: CommentModificationAuthContext<SessionMeta>): boolean
}

/** The comment rules, generic over what the host's callbacks see of a session. */
function buildCommentRules<S>(opts: {
	getUserId(session: S): string | null
	canComment(session: S): boolean
	canModifyComment(ctx: CommentModificationContext<S>): boolean
}): CommentRules<S> {
	const { getUserId, canComment, canModifyComment } = opts

	/** A rule is an authorizer that receives the session's user id, resolved for it exactly once. */
	type Rule<Rec extends UnknownRecord> = (
		userId: string | null,
		args: CommentRuleArgs<S, Rec>
	) => Rec | null

	/**
	 * Adapt a rule to the authorizer signature: gate on `canComment` first, then resolve the
	 * session's user id exactly once.
	 */
	function withUserId<Rec extends UnknownRecord>(rule: Rule<Rec>): CommentRule<S, Rec> {
		return (args) => {
			if (!canComment(args.session)) return null
			return rule(getUserId(args.session), args)
		}
	}

	/**
	 * Authorize a record whose attribution lives in `field`: stamped from the session on create,
	 * immutable on update. With `ownerOnlyUpdate`, only the author may update it at all.
	 */
	function authorizeAuthored<Rec extends UnknownRecord>(
		field: keyof Rec & string,
		{ ownerOnlyUpdate = false } = {}
	): Rule<Rec> {
		return (userId, { type, prev, next }) => {
			if (type === 'create') {
				if (!userId) return null // no identity to attribute → reject
				return { ...next, [field]: userId } as Rec
			}
			if (type === 'update') {
				if (next[field] !== prev[field]) return null // attribution is immutable
				if (ownerOnlyUpdate && userId !== prev[field]) return null // only the author edits
				return next
			}
			return prev
		}
	}

	/**
	 * Police a soft-deleted record type on top of `base`, asking `canModifyComment` who may make the
	 * write: `isDeleted` is write-once, never set at create, and clients never hard-delete these
	 * records. Removals are server-initiated only, so once the server prunes a flagged record there
	 * is no un-delete.
	 *
	 * An update here is one of two writes, asked about separately: flipping `isDeleted` is a delete,
	 * anything else is an edit. Telling them apart is what lets a host grant deletes without granting
	 * edits — and an update that does both has to clear both gates, so a delete can't carry an edit
	 * out with it.
	 *
	 * `modificationFor` returns null for a write `canModifyComment` isn't asked about: a thread's
	 * "edit" is a resolve or reopen, which is open to anyone with access and policed by `base`.
	 */
	function authorizeSoftDeleted<Rec extends UnknownRecord & { isDeleted: boolean }>(
		ownerOf: (rec: Rec) => string,
		modificationFor: (rec: Rec, write: 'edit' | 'delete') => CommentModification | null,
		base: Rule<Rec>
	): Rule<Rec> {
		return (userId, args) => {
			if (args.type === 'delete') return null
			const result = base(userId, args)
			if (!result) return null
			// A record can't be born deleted — that would smuggle a deletion past the update checks.
			if (args.type === 'create') return args.next.isDeleted ? null : result

			const { prev, next, session } = args
			const mayModify = (write: 'edit' | 'delete') => {
				const modification = modificationFor(prev, write)
				if (!modification) return true
				return canModifyComment({ session, userId, ownerId: ownerOf(prev), ...modification })
			}

			if (prev.isDeleted === next.isDeleted) return mayModify('edit') ? result : null

			if (prev.isDeleted) return null // write-once: never cleared
			if (!mayModify('delete')) return null
			// The built-in client deletes by setting the flag and nothing else. An update carrying
			// more than that is also an edit, and has to be allowed as one — otherwise a delete-only
			// permission could rewrite a comment on its way out.
			if (!isEqual({ ...next, isDeleted: prev.isDeleted }, prev) && !mayModify('edit')) return null
			return result
		}
	}

	/**
	 * Threads stay editable by anyone with access (resolve/reopen), but resolution is itself an
	 * attribution: a non-null `resolved.by` must be the session's own user.
	 */
	const authorizeThreadResolution: Rule<TLCommentThread> = (userId, args) => {
		const result = authorizeAuthored<TLCommentThread>('createdBy')(userId, args)
		if (!result) return null
		if (args.type === 'create') {
			// Delete + re-put could otherwise smuggle in a resolution forged in someone else's name.
			const { next } = args
			if (next.resolved && next.resolved.by !== userId) return null
		}
		if (args.type === 'update') {
			const { prev, next } = args
			const changed =
				prev.resolved?.at !== next.resolved?.at || prev.resolved?.by !== next.resolved?.by
			if (changed && next.resolved && next.resolved.by !== userId) return null
		}
		return result
	}

	/**
	 * Reject an update that changes any of `fields` — the structural ones an update must never touch.
	 * A mutable `threadId` would let an author re-parent a comment between conversations (and, where
	 * threads span files, between files); a mutable `createdAt` would let it be re-sorted after the fact.
	 */
	function immutableFields<Rec extends UnknownRecord>(
		fields: readonly (keyof Rec & string)[],
		base: Rule<Rec>
	): Rule<Rec> {
		return (userId, args) => {
			if (args.type === 'update') {
				const { prev, next } = args
				for (const field of fields) {
					if (next[field] !== prev[field]) return null
				}
			}
			return base(userId, args)
		}
	}

	const authorizeReactionBase = authorizeAuthored<TLCommentReaction>('userId', {
		ownerOnlyUpdate: true,
	})

	/**
	 * A reaction's id is derived from its (comment, user, emoji) triple. The base rule already stamps
	 * `userId` and lets only the owner change a reaction, but the id, comment, and emoji are all
	 * client-supplied, so this adds:
	 *
	 * - On **create**, the id must be canonical for `commentId` + the session's user + `next.emoji`.
	 *   Otherwise a forged client could squat another user's id slot, or land two records on one triple.
	 *
	 * - On **update**, everything feeding the id is immutable, so a re-react is a create/delete rather
	 *   than an update and the id can never drift from its fields.
	 */
	const authorizeReaction: Rule<TLCommentReaction> = (userId, args) => {
		// Only the reactor may remove their own reaction. Cascades still sweep every reactor's
		// records because server-initiated writes carry no session and so skip authorizers
		// entirely — an open client delete was never what made the sweep work.
		if (args.type === 'delete') {
			return userId && userId === args.prev.userId ? args.prev : null
		}
		const result = authorizeReactionBase(userId, args)
		if (!result) return null
		if (args.type === 'create') {
			// Unreachable: the base rule already rejected identity-less creates. Checked to narrow.
			if (!userId) return null
			const { next } = args
			if (next.id !== createCommentReactionId(next.commentId, userId, next.emoji)) {
				return null
			}
		}
		if (args.type === 'update') {
			const { prev, next } = args
			if (next.commentId !== prev.commentId) return null
			if (next.threadId !== prev.threadId) return null
			if (next.pageId !== prev.pageId) return null
			if (next.emoji !== prev.emoji) return null
		}
		return result
	}

	return {
		comment: withUserId(
			authorizeSoftDeleted<TLComment>(
				(comment) => comment.authorId,
				(comment, write) => ({
					action: write === 'delete' ? 'delete-comment' : 'edit-comment',
					comment,
				}),
				// The owner-only update check that used to sit here (`ownerOnlyUpdate`) is now
				// `canModifyComment`'s to make, since it can tell an edit from a delete. Attribution
				// is still stamped from the session and immutable either way.
				//
				// `pageId` stays mutable: it's denormalized from the thread, and moving an anchored
				// thread between pages rewrites it on every comment in the thread.
				immutableFields<TLComment>(
					['threadId', 'createdAt'],
					authorizeAuthored<TLComment>('authorId')
				)
			)
		),
		'comment-thread': withUserId(
			authorizeSoftDeleted<TLCommentThread>(
				(thread) => thread.createdBy,
				// Resolving and reopening stay open to anyone with access, so a thread's "edit" isn't
				// asked about — only its delete is.
				(thread, write) => (write === 'delete' ? { action: 'delete-thread', thread } : null),
				immutableFields<TLCommentThread>(['createdAt'], authorizeThreadResolution)
			)
		),
		// Deletion is deliberately open: anyone with room access may hard-delete any reaction. Reactions
		// have no soft-delete flag on purpose — a reaction is a toggle, and a host cascading a comment or
		// thread deletion must sweep every reactor's records, not just the caller's own.
		'comment-reaction': withUserId(authorizeReaction),
	}
}

const ownerOnly = ({ userId, ownerId }: { userId: string | null; ownerId: string }) =>
	userId === ownerId

/**
 * Server-side write authorization for comment records, for use with a sync server's
 * `authorizeRecord` option (see `TLSocketRoom` in `@tldraw/sync-core`). Forces authorship from the
 * session's identity so nothing can be posted, resolved, or deleted in someone else's name:
 *
 * - `comment`: `authorId` is stamped on create (anonymous creates rejected) and immutable after,
 *   and who may update is `canModifyComment`'s call — the author's, unless widened. `threadId` and
 *   `createdAt` are immutable too.
 * - `comment-thread`: `createdBy` and `createdAt` are fixed on create. Anyone with access may
 *   resolve/reopen, but a non-null `resolved.by` must be the session's own user.
 * - `comment-reaction`: `userId` is stamped and immutable, a create must land at the canonical id
 *   for its (comment, user, emoji) triple, and only the reactor may delete their own.
 * - Deletion is soft for comments and threads: a write-once `isDeleted` flag, never set at create.
 *   Client hard-deletes are always rejected — record removals are server-side only.
 * - `canComment` gates every write before the per-type rules, defaulting to `!isReadonly`.
 * - `canModifyComment` decides who may edit a comment, delete a comment, or delete a thread. It
 *   defaults to the record's owner, and is asked after the structural rules above, so widening it
 *   grants no more than those three writes on records the session doesn't own.
 *
 * Comment records ride alongside your document records, so widen the room's record union to
 * include them, then spread the result into the authorizer map alongside your own entries:
 *
 * @example
 * ```ts
 * interface SessionMeta {
 * 	userId: string | null
 * }
 *
 * type MyRecord = TLRecord | TLComment | TLCommentThread | TLCommentReaction
 *
 * new TLSocketRoom<MyRecord, SessionMeta>({
 * 	authorizeRecord: {
 * 		...createCommentAuthorizers<SessionMeta>({ getUserId: (session) => session.meta.userId }),
 * 	},
 * })
 * ```
 *
 * @deprecated Use {@link createCommentRule}: one rule for the room's `authorize` option.
 * @public
 */
export function createCommentAuthorizers<SessionMeta>(
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	opts: CommentAuthorizerOptions<SessionMeta>
	// eslint-disable-next-line @typescript-eslint/no-deprecated
): TLRecordAuthorizers<TLCommentRecord, SessionMeta> {
	return buildCommentRules<LegacySession<SessionMeta>>({
		getUserId: opts.getUserId,
		canComment: opts.canComment ?? (({ isReadonly }) => !isReadonly),
		canModifyComment: opts.canModifyComment ?? ownerOnly,
	})
}

/**
 * Options for {@link createCommentRule}.
 *
 * @public
 */
export interface CommentRuleOptions<SessionMeta> {
	/**
	 * Resolve the authenticated user id for a session. Defaults to `session.userId`. `null` means
	 * anonymous: they can't create records, and own none, so the default
	 * {@link CommentRuleOptions.canModifyComment} grants them no edits or deletes either.
	 */
	getUserId?(session: TLSyncRuleSession<SessionMeta>): string | null

	/**
	 * Whether a session may write comment records at all, checked before the per-type rules.
	 * Defaults to the session's object-store access (`session.access.objects === 'write'`).
	 * Anonymous sessions can't create comment records regardless, because `getUserId` is `null`.
	 */
	canComment?(session: TLSyncRuleSession<SessionMeta>): boolean

	/**
	 * Whether a session may edit or delete a comment, or delete a thread. Defaults to the record's
	 * owner. Asked after the structural rules, so widening it grants those three writes and nothing
	 * else. See {@link CommentAuthorizerOptions.canModifyComment} for the full contract.
	 */
	canModifyComment?(ctx: CommentModificationRuleContext<SessionMeta>): boolean
}

/**
 * The comment rules for a room's `authorize` option (see `TLSocketRoom` in `@tldraw/sync-core`).
 * Judges comment threads, comments and reactions with the same rules as
 * {@link createCommentAuthorizers}, except that attribution is checked rather than stamped: a
 * create must already carry the session's user as its author (`authorId`, `createdBy`, a
 * reaction's `userId`). Every other record passes through, so compose with your own rule:
 *
 * @example
 * ```ts
 * const comments = createCommentRule<MyRecord, SessionMeta>({
 * 	canComment: (session) => session.meta.canEdit,
 * })
 *
 * new TLSocketRoom<MyRecord, SessionMeta>({
 * 	authorize: (args) => comments(args) ?? myOwnRule(args),
 * })
 * ```
 *
 * @public
 */
export function createCommentRule<R extends UnknownRecord, SessionMeta>(
	opts: CommentRuleOptions<SessionMeta> = {}
): TLSyncRule<R, SessionMeta> {
	type Session = TLSyncRuleSession<SessionMeta>
	const rules = buildCommentRules<Session>({
		getUserId: opts.getUserId ?? ((session) => session.userId),
		canComment: opts.canComment ?? ((session) => session.access.objects === 'write'),
		canModifyComment: opts.canModifyComment ?? ownerOnly,
	})
	// The per-type rules return the record to allow (stamped on create) or null to refuse. A create
	// they would stamp differently is refused: the client chose someone else's name.
	const judge = (
		session: Session,
		change: TLRecordChange<TLCommentRecord>
	): UnknownRecord | null => {
		const args = { session, ...change }
		switch ((change.type === 'delete' ? change.prev : change.next).typeName) {
			case 'comment':
				return rules.comment(args as CommentRuleArgs<Session, TLComment>)
			case 'comment-thread':
				return rules['comment-thread'](args as CommentRuleArgs<Session, TLCommentThread>)
			case 'comment-reaction':
				return rules['comment-reaction'](args as CommentRuleArgs<Session, TLCommentReaction>)
		}
	}
	return perRecord(({ record, ...change }, { session, before, after }) => {
		if (!isCommentRecord(record)) return null
		// Structural, so no edit permission overrides it: a comment lives on its thread's page.
		if (record.typeName === 'comment' && change.type !== 'delete') {
			const comment = record as unknown as TLComment
			const prevPageId =
				change.type === 'update' ? (change.prev as unknown as TLComment).pageId : null
			if (comment.pageId !== prevPageId) {
				const thread = after(comment.threadId) as TLCommentThread | undefined
				if (thread?.pageId !== comment.pageId) return 'comment must stay on its thread page'
			}
		}
		const moveRefusal =
			change.type === 'update' && isMove(change.prev, change.next)
				? authorizeMove(
						session,
						change.prev as unknown as TLCommentRecord,
						change.next as unknown as TLCommentRecord,
						before,
						after
					)
				: undefined
		if (moveRefusal === null) return null
		const allowed = judge(session, change as unknown as TLRecordChange<TLCommentRecord>)
		if (allowed && (change.type !== 'create' || isEqual(allowed, record))) return null
		return moveRefusal ?? `${record.typeName} ${change.type} refused`
	})
}

/**
 * A move is a location-only update: a thread's `pageId`/`anchor`, or a comment's `pageId`. The
 * commenting plugin writes these to keep a thread attached to its shape, in the push of whoever
 * moved or deleted the shape, who is usually not the author. {@link authorizeMove} lets those
 * through on document access alone; any other move is judged like an edit.
 */
function isMove(prev: UnknownRecord, next: UnknownRecord): boolean {
	switch (prev.typeName) {
		case 'comment-thread':
			return isEqual(
				{
					...next,
					pageId: (prev as TLCommentThread).pageId,
					anchor: (prev as TLCommentThread).anchor,
				},
				prev
			)
		case 'comment':
			return isEqual({ ...next, pageId: (prev as TLComment).pageId }, prev)
		default:
			return false
	}
}

type Reader = (id: string) => UnknownRecord | undefined

function authorizeMove(
	session: TLSyncRuleSession<unknown>,
	prev: TLCommentRecord,
	next: TLCommentRecord,
	before: Reader,
	after: Reader
): string | null {
	if (session.access.document !== 'write') return `${next.typeName} move refused`
	// already checked to land on its thread's page
	if (next.typeName === 'comment') return null
	return isShapeFollow(prev as TLCommentThread, next as TLCommentThread, before, after)
		? null
		: `${next.typeName} move refused`
}

/**
 * Whether a thread move is what `registerCommentAnchorLifecycle` writes for a shape change in this
 * same push:
 *
 * - shape moved page (itself or an ancestor): `pageId` follows it, anchor unchanged
 * - shape deleted: anchor becomes a point, `pageId` unchanged
 * - shape re-created (undo of a delete): point anchor re-attaches to it, `pageId` unchanged or its page
 */
function isShapeFollow(
	prev: TLCommentThread,
	next: TLCommentThread,
	before: Reader,
	after: Reader
): boolean {
	const was = prev.anchor
	const now = next.anchor
	if (was.type === 'shape' && isEqual(was, now)) {
		const page = pageOfShape(after, was.shapeId)
		return page === next.pageId && pageOfShape(before, was.shapeId) !== page
	}
	if (was.type === 'shape' && now.type === 'point') {
		return next.pageId === prev.pageId && !!before(was.shapeId) && !after(was.shapeId)
	}
	if (was.type === 'point' && now.type === 'shape') {
		if (before(now.shapeId) || !after(now.shapeId)) return false
		return next.pageId === prev.pageId || next.pageId === pageOfShape(after, now.shapeId)
	}
	return false
}

function pageOfShape(read: Reader, shapeId: string): string | undefined {
	const seen = new Set<string>()
	let id = shapeId
	while (isShapeId(id) && !seen.has(id)) {
		seen.add(id)
		const shape = read(id) as TLShape | undefined
		if (!shape) return undefined
		id = shape.parentId
	}
	return isPageId(id) ? id : undefined
}
