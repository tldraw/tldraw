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
	| { type: 'region'; x: number; y: number; w: number; h: number }
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
	typeName: 'comment' | 'comment-thread',
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
 * The `records` map to pass to `createTLSchema` / the client `records` option so comment
 * threads and comments sync. Register both types together — a comment without its thread type
 * (or vice versa) will fail schema validation on one side of the connection.
 *
 * @public
 */
export const commentSchemaRecords = {
	'comment-thread': commentThreadRecordConfig,
	comment: commentRecordConfig,
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
