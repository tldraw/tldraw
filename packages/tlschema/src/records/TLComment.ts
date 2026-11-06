import {
	BaseRecord,
	PolicyContext,
	RecordId,
	RecordPolicy,
	UnknownRecord,
	createRecordMigrationSequence,
	isOwnedBy,
} from '@tldraw/store'
import { JsonObject, isEqual } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { richTextValidator, TLRichText } from '../misc/TLRichText'
import { CustomRecordInfo, createCustomRecordId, isCustomRecordId } from './TLCustomRecord'
import { TLPageId } from './TLPage'
import { TLShapeId } from './TLShape'

/**
 * Where a comment thread is anchored on the canvas. Modeled as a discriminated union so new
 * anchor kinds can be added without breaking existing threads:
 *
 * - `shape` — pinned to a shape. `x`/`y` are normalized (0–1) within the shape's bounds, so the pin
 *   keeps its spot as the shape moves, resizes, and rotates. `isPrecise` mirrors arrow bindings:
 *   when false (the default) the pin sits at a consumer-defined spot instead, top-right out of the
 *   box, and `x`/`y` are the remembered precise position
 * - `point` — pinned to a fixed point on the page, in page coordinates
 * - `region` — pinned to a rectangular area of the page, in page coordinates
 * - `page` — a page-level thread with no spatial anchor
 *
 * @public
 */
export type TLCommentAnchor =
	| { type: 'shape'; shapeId: TLShapeId; x: number; y: number; isPrecise: boolean }
	| { type: 'point'; x: number; y: number }
	| {
			type: 'region'
			x: number
			y: number
			w: number
			h: number
			/** The normalized (0–1) corner the pin sits on — where the creating drag was released.
			 *  Absent on older records; consumers fall back to a corner of their own choosing. */
			pinX?: number
			pinY?: number
	  }
	| { type: 'page' }

/**
 * A comment thread. The thread owns the anchor (where the conversation lives on the canvas) and
 * the resolution state; the messages themselves are `TLComment` records pointing at the thread
 * via `threadId`, ordered by `createdAt`. v1 threads are flat — no nested replies.
 *
 * Threads and comments are document records, but they're intended to be served through the sync
 * server's object-store lane: gated by the session's `objectAccess` rather than `isReadonly`
 * (so "can comment but not edit" is expressible), excluded from document snapshots and `.tldr`
 * exports server-side, and persisted in a separate lane from the main document.
 *
 * Opt-in: register with `createTLSchema({ records: commentSchemaRecords })` on the server and
 * the matching `records` option on the client — neither type is part of the default schema, and
 * both sides must register them identically.
 *
 * @public
 */
export interface TLCommentThread extends BaseRecord<'comment-thread', TLCommentThreadId> {
	/** The page the thread lives on. */
	pageId: TLPageId
	/** Where the thread is anchored on that page. */
	anchor: TLCommentAnchor
	/** Who started the thread. Client-supplied; sync servers are expected to stamp/verify it. */
	createdBy: string
	createdAt: number
	/** Resolution state: when and by whom the thread was resolved, or null while open. */
	resolved: { at: number; by: string } | null
	/**
	 * Whether the thread is soft-deleted. Clients set the flag and leave the record in place. Sync
	 * servers are expected to enforce it as write-once and creator-only, reject client hard
	 * deletes, and drop flagged threads from future room loads.
	 */
	isDeleted: boolean
	meta: JsonObject
}

/** @public */
export type TLCommentThreadId = RecordId<TLCommentThread>

/**
 * A single comment message within a thread. See `TLCommentThread` for the overall model and
 * sync/registration notes.
 *
 * Comment mutations are deliberately not undoable — create/edit them with
 * `{ history: 'ignore' }` to avoid multiplayer surprises like a comment reappearing after
 * someone else deleted it.
 *
 * @public
 */
export interface TLComment extends BaseRecord<'comment', TLCommentId> {
	/** The thread this comment belongs to. */
	threadId: TLCommentThreadId
	/** Denormalized from the thread so per-page queries don't need a join. */
	pageId: TLPageId
	/** See `TLCommentThread.createdBy` — same server-stamping caveat applies. */
	authorId: string
	createdAt: number
	/** Null until the comment is first edited. */
	editedAt: number | null
	/** Rich text body. Use `toRichText(...)` for plaintext input. */
	body: TLRichText
	/** Whether the comment is soft-deleted. Same model as `TLCommentThread.isDeleted`. */
	isDeleted: boolean
	meta: JsonObject
}

/** @public */
export type TLCommentId = RecordId<TLComment>

/**
 * One person's emoji reaction to one comment.
 *
 * A reaction is its own record rather than a field on the comment: comment records are owner-only
 * for updates, and a shared field would make concurrent reactions race to overwrite each other.
 *
 * A user holds at most one record per (comment, emoji) pair, enforced by the derived id — see
 * `createCommentReactionId`. Limiting a user to one reaction overall is client-side policy (the
 * commenting package's `reactionMode`), not a property of this record.
 *
 * @public
 */
export interface TLCommentReaction extends BaseRecord<'comment-reaction', TLCommentReactionId> {
	/** The comment being reacted to. */
	commentId: TLCommentId
	/** Denormalized from the comment, so a thread's reactions can be found without a join. */
	threadId: TLCommentThreadId
	/** Denormalized from the comment — see `TLComment.pageId`. */
	pageId: TLPageId
	/** Who reacted. See `TLCommentThread.createdBy` — same server-stamping caveat applies. */
	userId: string
	/** The emoji itself, as a string (e.g. `'👍'`), not a shortcode. */
	emoji: string
	createdAt: number
	meta: JsonObject
}

/** @public */
export type TLCommentReactionId = RecordId<TLCommentReaction>

/**
 * An emoji shortcode or literal. Bounded because reaction ids embed the emoji verbatim
 * (see {@link createCommentReactionId}), so an unbounded value means an unbounded record id.
 */
const emojiValidator = T.string.check((value) => {
	if (value.length === 0 || value.length > 64) {
		throw new T.ValidationError(`Expected an emoji of 1-64 characters, got ${value.length}`)
	}
})

const commentAnchorValidator: T.Validator<TLCommentAnchor> = T.union('type', {
	shape: T.object({
		type: T.literal('shape'),
		shapeId: idValidator<TLShapeId>('shape'),
		x: T.number,
		y: T.number,
		isPrecise: T.boolean,
	}),
	point: T.object({
		type: T.literal('point'),
		x: T.number,
		y: T.number,
	}),
	region: T.object({
		type: T.literal('region'),
		x: T.number,
		y: T.number,
		w: T.number,
		h: T.number,
		pinX: T.number.optional(),
		pinY: T.number.optional(),
	}),
	page: T.object({
		type: T.literal('page'),
	}),
})

/**
 * Guard migrations for the comment record types. Each sequence starts with an identity migration
 * that has no `down`, so a session whose schema predates the comment types is rejected with
 * CLIENT_TOO_OLD instead of being sent records its store can't represent.
 */
function createCommentGuardMigrations(
	typeName: 'comment' | 'comment-thread' | 'comment-reaction',
	extra: Parameters<typeof createRecordMigrationSequence>[0]['sequence'] = []
) {
	return createRecordMigrationSequence({
		sequenceId: `com.tldraw.${typeName}`,
		recordType: typeName,
		retroactive: true,
		sequence: [
			{
				id: `com.tldraw.${typeName}/1`,
				up: (record) => record,
			},
			...extra,
		],
	})
}

// Comment actions:
// - `comments:write`: start threads, reply, react, resolve, and change your own comments.
// - `comments:manage`: delete any comment or thread (moderators). Never edit someone else's text.

function changedOnly<R extends UnknownRecord>(prev: R, next: R, keys: (keyof R)[]) {
	const a: any = { ...prev }
	const b: any = { ...next }
	for (const key of keys) {
		delete a[key]
		delete b[key]
	}
	return isEqual(a, b)
}

function softDelete<R extends UnknownRecord & { isDeleted: boolean }>(
	ctx: PolicyContext & { prev: R; next: R }
): 'none' | 'delete' | 'invalid' {
	if (ctx.prev.isDeleted === ctx.next.isDeleted) return ctx.prev.isDeleted ? 'invalid' : 'none'
	// Write once: a deleted record never comes back.
	if (ctx.prev.isDeleted) return 'invalid'
	return 'delete'
}

/**
 * The policy of comment threads. It replaces the server's `createCommentAuthorizers` and the
 * client's `canModifyComment` with one set of rules.
 *
 * - Create: needs `comments:write`. `createdBy` is the actor, not deleted, and not resolved by
 *   someone else.
 * - Update: needs `comments:write`. `createdBy`, `createdAt`, and `pageId` never change. A new
 *   resolution must name the actor. A soft delete needs the `delete` action and changes nothing
 *   else.
 * - Hard delete: never from a client.
 * - Actions: `resolve` (anyone who may comment), `delete` (the creator, or `comments:manage`).
 *
 * @public
 */
export const commentThreadPolicy: RecordPolicy<TLCommentThread> = {
	create: ({ can, actor, next }) =>
		can('comments:write') &&
		isOwnedBy(actor, next.createdBy) &&
		!next.isDeleted &&
		(next.resolved === null || isOwnedBy(actor, next.resolved.by)),
	update: (ctx) => {
		const { prev, next, actor } = ctx
		if (!ctx.can('comments:write')) return false
		if (
			prev.createdBy !== next.createdBy ||
			prev.createdAt !== next.createdAt ||
			prev.pageId !== next.pageId
		) {
			return false
		}
		const deletion = softDelete(ctx)
		if (deletion === 'invalid') return false
		if (deletion === 'delete') {
			return (
				changedOnly(prev, next, ['isDeleted']) &&
				ctx.authorize({ verb: 'action', action: 'delete', record: prev })
			)
		}
		if (!isEqual(prev.resolved, next.resolved)) {
			if (next.resolved && !isOwnedBy(actor, next.resolved.by)) return false
			if (!ctx.authorize({ verb: 'action', action: 'resolve', record: prev })) return false
		}
		return true
	},
	delete: () => false,
	actions: {
		resolve: ({ can }) => can('comments:write'),
		delete: ({ can, actor, record }) =>
			can('comments:manage') || (can('comments:write') && isOwnedBy(actor, record.createdBy)),
	},
}

/**
 * The policy of comments.
 *
 * - Create: needs `comments:write`. `authorId` is the actor, and the comment is not deleted.
 * - Update: `authorId`, `threadId`, `pageId`, and `createdAt` never change. A text edit needs the
 *   `edit` action. A soft delete needs the `delete` action and changes nothing else.
 * - Hard delete: never from a client.
 * - Actions: `edit` (the author only), `delete` (the author, or `comments:manage`).
 *
 * A host that lets moderators edit too overrides `actions.edit`. The write rule and the UI both
 * use the action, so they cannot drift.
 *
 * @public
 */
export const commentPolicy: RecordPolicy<TLComment> = {
	create: ({ can, actor, next }) =>
		can('comments:write') && isOwnedBy(actor, next.authorId) && !next.isDeleted,
	update: (ctx) => {
		const { prev, next } = ctx
		if (
			prev.authorId !== next.authorId ||
			prev.threadId !== next.threadId ||
			prev.pageId !== next.pageId ||
			prev.createdAt !== next.createdAt
		) {
			return false
		}
		const deletion = softDelete(ctx)
		if (deletion === 'invalid') return false
		if (deletion === 'delete') {
			return (
				changedOnly(prev, next, ['isDeleted']) &&
				ctx.authorize({ verb: 'action', action: 'delete', record: prev })
			)
		}
		return ctx.authorize({ verb: 'action', action: 'edit', record: prev })
	},
	delete: () => false,
	actions: {
		edit: ({ can, actor, record }) => can('comments:write') && isOwnedBy(actor, record.authorId),
		delete: ({ can, actor, record }) =>
			can('comments:manage') || (can('comments:write') && isOwnedBy(actor, record.authorId)),
	},
}

/**
 * The policy of comment reactions. The reactor is the actor, the id is the canonical id for
 * (comment, actor, emoji), nothing changes after create, and only the reactor deletes it.
 *
 * @public
 */
export const commentReactionPolicy: RecordPolicy<TLCommentReaction> = {
	create: ({ can, actor, next }) =>
		can('comments:write') &&
		isOwnedBy(actor, next.userId) &&
		next.id === createCommentReactionId(next.commentId, actor.id!, next.emoji),
	update: () => false,
	delete: ({ actor, prev }) => isOwnedBy(actor, prev.userId),
}

/**
 * Config for registering the `comment-thread` record type in a tldraw schema. Pass via
 * `commentSchemaRecords`; see `TLCommentThread`.
 *
 * @public
 */
export const commentThreadRecordConfig: CustomRecordInfo = {
	scope: 'document',
	policy: commentThreadPolicy,
	migrations: createCommentGuardMigrations('comment-thread', [
		{
			// Shape anchors gained normalized x/y + isPrecise; existing ones were imprecise (top-right).
			id: 'com.tldraw.comment-thread/2',
			up: (record) => {
				const anchor = (record as any).anchor
				if (anchor?.type === 'shape' && anchor.x === undefined) {
					;(record as any).anchor = { ...anchor, x: 1, y: 0, isPrecise: false }
				}
				return record
			},
			down: (record) => {
				const anchor = (record as any).anchor
				if (anchor?.type === 'shape') {
					;(record as any).anchor = { type: 'shape', shapeId: anchor.shapeId }
				}
				return record
			},
		},
		{
			// Region anchors gained an optional pin corner (where the creating drag released).
			id: 'com.tldraw.comment-thread/3',
			up: (record) => record,
			down: (record) => {
				const anchor = (record as any).anchor
				if (anchor?.type === 'region') {
					const { pinX: _pinX, pinY: _pinY, ...rest } = anchor
					;(record as any).anchor = rest
				}
				return record
			},
		},
	]),
	validator: T.object({
		id: idValidator<TLCommentThreadId>('comment-thread'),
		typeName: T.literal('comment-thread'),
		pageId: idValidator<TLPageId>('page'),
		anchor: commentAnchorValidator,
		createdBy: T.string,
		createdAt: T.number,
		resolved: T.object({ at: T.number, by: T.string }).nullable(),
		isDeleted: T.boolean,
		meta: T.jsonValue,
	}),
}

/**
 * Config for registering the `comment` record type in a tldraw schema. Pass via
 * `commentSchemaRecords`; see `TLComment`.
 *
 * @public
 */
export const commentRecordConfig: CustomRecordInfo = {
	scope: 'document',
	policy: commentPolicy,
	migrations: createCommentGuardMigrations('comment'),
	validator: T.object({
		id: idValidator<TLCommentId>('comment'),
		typeName: T.literal('comment'),
		threadId: idValidator<TLCommentThreadId>('comment-thread'),
		pageId: idValidator<TLPageId>('page'),
		authorId: T.string,
		createdAt: T.number,
		editedAt: T.number.nullable(),
		body: richTextValidator,
		isDeleted: T.boolean,
		meta: T.jsonValue,
	}),
}

/**
 * Config for registering the `comment-reaction` record type in a tldraw schema. Pass via
 * `commentSchemaRecords`; see `TLCommentReaction`.
 *
 * @public
 */
export const commentReactionRecordConfig: CustomRecordInfo = {
	scope: 'document',
	policy: commentReactionPolicy,
	migrations: createCommentGuardMigrations('comment-reaction'),
	validator: T.object({
		id: idValidator<TLCommentReactionId>('comment-reaction'),
		typeName: T.literal('comment-reaction'),
		commentId: idValidator<TLCommentId>('comment'),
		threadId: idValidator<TLCommentThreadId>('comment-thread'),
		pageId: idValidator<TLPageId>('page'),
		userId: T.string,
		emoji: emojiValidator,
		createdAt: T.number,
		meta: T.jsonValue,
	}),
}

/**
 * The `records` map to pass to `createTLSchema` / the client `records` option so comment
 * threads, comments, and reactions sync. Register the types together — one without the others
 * will fail schema validation on one side of the connection.
 *
 * @public
 */
export const commentSchemaRecords = {
	'comment-thread': commentThreadRecordConfig,
	comment: commentRecordConfig,
	'comment-reaction': commentReactionRecordConfig,
}

/** @public */
export function createCommentThreadId(id?: string): TLCommentThreadId {
	return createCustomRecordId('comment-thread', id) as TLCommentThreadId
}

/** @public */
export function createCommentId(id?: string): TLCommentId {
	return createCustomRecordId('comment', id) as TLCommentId
}

/**
 * The id of one user's reaction to one comment, derived from the (comment, user, emoji) triple
 * rather than random, so the same triple always addresses the same record and two tabs converge
 * instead of racing to create duplicates. The sync authorizer leans on this, so it must be
 * injective: all three parts are URI-encoded before joining, so a `:` in any of them can't shift
 * the boundary and collapse two triples onto one id.
 *
 * @public
 */
export function createCommentReactionId(
	commentId: TLCommentId,
	userId: string,
	emoji: string
): TLCommentReactionId {
	return createCustomRecordId(
		'comment-reaction',
		`${encodeURIComponent(commentId)}:${encodeURIComponent(userId)}:${encodeURIComponent(emoji)}`
	) as TLCommentReactionId
}

/**
 * Type guard for `TLCommentThreadId`. `isCommentId` rejects these — `comment-thread:` and
 * `comment:` differ in the character after `comment`, so the prefixes never overlap.
 *
 * @public
 */
export function isCommentThreadId(id: string): id is TLCommentThreadId {
	return isCustomRecordId('comment-thread', id)
}

/**
 * Type guard for `TLCommentId`. See `isCommentThreadId`.
 *
 * @public
 */
export function isCommentId(id: string): id is TLCommentId {
	return isCustomRecordId('comment', id)
}

/**
 * Type guard for `TLCommentReactionId`. See `isCommentThreadId`.
 *
 * @public
 */
export function isCommentReactionId(id: string): id is TLCommentReactionId {
	return isCustomRecordId('comment-reaction', id)
}

/**
 * Create a new comment thread record. Pair with `createComment` for the thread's first message.
 *
 * @public
 */
export function createCommentThread(props: {
	pageId: TLPageId
	anchor: TLCommentAnchor
	createdBy: string
	now?: number
	meta?: JsonObject
}): TLCommentThread {
	return {
		id: createCommentThreadId(),
		typeName: 'comment-thread',
		pageId: props.pageId,
		anchor: props.anchor,
		createdBy: props.createdBy,
		createdAt: props.now ?? Date.now(),
		resolved: null,
		isDeleted: false,
		meta: props.meta ?? {},
	}
}

/**
 * Create a new comment record within a thread.
 *
 * @public
 */
export function createComment(props: {
	threadId: TLCommentThreadId
	pageId: TLPageId
	authorId: string
	body: TLRichText
	now?: number
	meta?: JsonObject
}): TLComment {
	return {
		id: createCommentId(),
		typeName: 'comment',
		threadId: props.threadId,
		pageId: props.pageId,
		authorId: props.authorId,
		createdAt: props.now ?? Date.now(),
		editedAt: null,
		body: props.body,
		isDeleted: false,
		meta: props.meta ?? {},
	}
}

/**
 * Create a reaction record for one user's reaction to one comment. The id is derived from the
 * comment and user (see `createCommentReactionId`), so re-reacting overwrites rather than adding.
 *
 * @public
 */
export function createCommentReaction(props: {
	commentId: TLCommentId
	threadId: TLCommentThreadId
	pageId: TLPageId
	userId: string
	emoji: string
	now?: number
	meta?: JsonObject
}): TLCommentReaction {
	return {
		id: createCommentReactionId(props.commentId, props.userId, props.emoji),
		typeName: 'comment-reaction',
		commentId: props.commentId,
		threadId: props.threadId,
		pageId: props.pageId,
		userId: props.userId,
		emoji: props.emoji,
		createdAt: props.now ?? Date.now(),
		meta: props.meta ?? {},
	}
}
