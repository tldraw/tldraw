import { BaseRecord, RecordId, createRecordMigrationSequence } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
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
 * - `shape` — pinned to a shape. `x`/`y` are normalized (0–1) within the shape's page bounds, so
 *   the pin keeps its spot as the shape moves and resizes. `isPrecise` mirrors arrow bindings: when
 *   true the pin sits at exactly `x`/`y`; when false (the default) it sits at a consumer-defined
 *   spot (top-right out of the box), and `x`/`y` are the remembered precise position
 * - `point` — pinned to a fixed point on the page, in page coordinates
 * - `region` — pinned to a rectangular area of the page, in page coordinates
 * - `page` — a page-level thread with no spatial anchor
 * - `text-range` — pinned to a character range inside a shape's text
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
			 *  Absent on older records; consumers fall back to their configured corner. */
			pinX?: number
			pinY?: number
	  }
	| { type: 'page' }
	| { type: 'text-range'; shapeId: TLShapeId; from: number; to: number }

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
	/**
	 * Who started the thread. Client-supplied for now; the sync server should stamp/verify this
	 * from the session's authenticated identity once record-level authorization lands (the same
	 * model presence already uses for self-ownership).
	 */
	createdBy: string
	createdAt: number
	/** Resolution state: when and by whom the thread was resolved, or null while open. */
	resolved: { at: number; by: string } | null
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
	meta: JsonObject
}

/** @public */
export type TLCommentId = RecordId<TLComment>

/**
 * One person's emoji reaction to one comment.
 *
 * A reaction is its own record rather than a field on the comment, for the same reason read
 * receipts are their own row: it's one person's data about someone else's comment. Comment records
 * are owner-only for updates, so a reaction could never be written onto them; and holding
 * everyone's reactions in one shared field would mean each write carried the whole set, so two
 * people reacting at once would race to overwrite each other. A record per person keeps every
 * write to its own record, which is what lets concurrent reactions coexist.
 *
 * A user has at most one reaction per comment. That's enforced by the id: see
 * `createCommentReactionId`.
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
	'text-range': T.object({
		type: T.literal('text-range'),
		shapeId: idValidator<TLShapeId>('shape'),
		from: T.number,
		to: T.number,
	}),
})

/**
 * Guard migrations for the comment record types. Each sequence is retroactive and starts with an
 * identity migration that has no `down`: a sync server whose schema registers the comment types
 * cannot down-migrate records for a session whose schema predates them, so such sessions are
 * rejected with CLIENT_TOO_OLD (prompting a refresh) instead of being sent record types their
 * store cannot represent.
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

/**
 * Config for registering the `comment-thread` record type in a tldraw schema. Pass via
 * `commentSchemaRecords`; see `TLCommentThread`.
 *
 * @public
 */
export const commentThreadRecordConfig: CustomRecordInfo = {
	scope: 'document',
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
	migrations: createCommentGuardMigrations('comment-reaction'),
	validator: T.object({
		id: idValidator<TLCommentReactionId>('comment-reaction'),
		typeName: T.literal('comment-reaction'),
		commentId: idValidator<TLCommentId>('comment'),
		threadId: idValidator<TLCommentThreadId>('comment-thread'),
		pageId: idValidator<TLPageId>('page'),
		userId: T.string,
		emoji: T.string,
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
 * rather than random. This is what makes reaction identity structural: the same triple always
 * addresses the same record, so re-picking an emoji toggles that one record and two tabs converge
 * instead of racing to create duplicates. A user can hold one record per emoji on a comment
 * (multiple reactions); enforcing "at most one reaction total" is a client concern layered on top,
 * not a property of the id. The sync authorizer leans on this derivation, so it must be injective.
 *
 * `emoji` here is the reaction's token — the emoji glyph for the default palette, or whatever
 * opaque string a consumer's palette uses. All three parts are URI-encoded before joining, so a
 * `:` in any of them can't shift the boundary and collapse two different triples onto one id. The
 * id is only ever recomputed for comparison, never parsed back, so the encoding needs no inverse.
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
 * Type guard for `TLCommentThreadId`. Note `isCommentId` does not accept these: the prefixes
 * are `comment-thread:` vs `comment:`, and the character after `comment` differs (`-` vs `:`),
 * so the two never overlap.
 *
 * @public
 */
export function isCommentThreadId(id: string): id is TLCommentThreadId {
	return isCustomRecordId('comment-thread', id)
}

/**
 * Type guard for `TLCommentId`. See `isCommentThreadId` for why `comment-thread:...` ids are
 * correctly rejected here.
 *
 * @public
 */
export function isCommentId(id: string): id is TLCommentId {
	return isCustomRecordId('comment', id)
}

/**
 * Type guard for `TLCommentReactionId`. As with `isCommentThreadId`, the `comment-reaction:`
 * prefix never overlaps `comment:` — the character after `comment` differs (`-` vs `:`).
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
