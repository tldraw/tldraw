import { BaseRecord, RecordId } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { CustomRecordInfo, createCustomRecordId } from './TLCustomRecord'
import { TLShapeId } from './TLShape'

/**
 * Where a comment is anchored. Modeled as a discriminated union so new anchor kinds (page, point,
 * whole-document, text-range) can be added without breaking existing comments. v1 supports shapes.
 *
 * @public
 */
export interface TLCommentAnchor {
	type: 'shape'
	shapeId: TLShapeId
}

/**
 * A comment record. It lives in the tldraw document store and syncs through the room, but is
 * intended to be served through the room's object-store lane (`objectTypes` on the sync server):
 * object-lane records are gated by the session's `objectAccess` rather than `isReadonly`, are
 * excluded from document snapshots/`.tldr` exports server-side, and are persisted in a separate
 * lane from the main document. Opt-in: register it with
 * `createTLSchema({ records: commentSchemaRecords })` (and the matching `records` option on the
 * client) — it is not part of the default schema.
 *
 * v1 is flat (no threads/replies) and plaintext; `anchor` and `meta` leave room to grow.
 *
 * @public
 */
export interface TLComment extends BaseRecord<'comment', TLCommentId> {
	anchor: TLCommentAnchor
	authorId: string
	text: string
	createdAt: number
	updatedAt: number
	meta: JsonObject
}

/** @public */
export type TLCommentId = RecordId<TLComment>

const commentAnchorValidator = T.object({
	type: T.literal('shape'),
	shapeId: T.string,
})

/**
 * Config for registering the `comment` record type in a tldraw schema. Pass via
 * `createTLSchema({ records: commentSchemaRecords })` on the server and the matching `records`
 * option on the client (e.g. `useSync`). Both sides must register it identically.
 *
 * @public
 */
export const commentRecordConfig: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: T.string,
		typeName: T.literal('comment'),
		anchor: commentAnchorValidator,
		authorId: T.string,
		text: T.string,
		createdAt: T.number,
		updatedAt: T.number,
		meta: T.jsonValue,
	}),
}

/**
 * The `records` map to pass to `createTLSchema` / the client `records` option so comments sync.
 *
 * @public
 */
export const commentSchemaRecords = { comment: commentRecordConfig }

/** @public */
export function createCommentId(id?: string): TLCommentId {
	return createCustomRecordId('comment', id) as TLCommentId
}

/**
 * Create a new comment record.
 *
 * @public
 */
export function createComment(props: {
	anchor: TLCommentAnchor
	authorId: string
	text: string
	now?: number
	meta?: JsonObject
}): TLComment {
	const now = props.now ?? Date.now()
	return {
		id: createCommentId(),
		typeName: 'comment',
		anchor: props.anchor,
		authorId: props.authorId,
		text: props.text,
		createdAt: now,
		updatedAt: now,
		meta: props.meta ?? {},
	}
}
