import { BaseRecord, RecordId } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { CustomRecordInfo, createCustomRecordId } from './TLCustomRecord'

/**
 * One relation tuple stored in a room: `object#relation@subject`. For example
 * `page:abc#editor@user:ann` says that Ann is an editor of page `abc`.
 *
 * - `object` is any object reference, written as `type:id`. It is usually a record id in the room
 *   (`page:abc`, `shape:xyz`), but it can name an object that is not a record, such as
 *   `shape_type:draw` or `action:ai-generate`.
 * - `relation` is a relation name from the room's relation schema.
 * - `subject` is `type:id` (`user:ann`, `link:k1`), a userset `type:id#relation`
 *   (`team:design#member`, `page:abc#editor`), or `*` for anyone in the room.
 *
 * The relation schema decides who may read and write these records, in the same way as for any
 * other record. Tuples about the room itself and about objects above the room (files, folders,
 * teams) are not stored here. They live in a server-side tuple store.
 *
 * Opt-in: register with `createTLSchema({ records: relationSchemaRecords })` on the server and the
 * matching `records` option on the client.
 *
 * @public
 */
export interface TLRelation extends BaseRecord<'relation', TLRelationId> {
	object: string
	relation: string
	subject: string
	meta: JsonObject
}

/** @public */
export type TLRelationId = RecordId<TLRelation>

/**
 * Config for the `relation` record type. Pass via {@link relationSchemaRecords}.
 *
 * @public
 */
export const relationRecordConfig: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: idValidator<TLRelationId>('relation'),
		typeName: T.literal('relation'),
		object: T.string,
		relation: T.string,
		subject: T.string,
		meta: T.jsonValue,
	}),
}

/**
 * The `records` map to pass to `createTLSchema` and to the client `records` option so relation
 * tuples sync.
 *
 * @public
 */
export const relationSchemaRecords = {
	relation: relationRecordConfig,
}

/**
 * The id of a relation tuple. It is derived from the tuple, so one tuple has one record and two
 * clients that write the same tuple converge. All parts are URI-encoded so that a separator inside
 * one part cannot make two tuples share an id.
 *
 * @public
 */
export function createRelationId(object: string, relation: string, subject: string): TLRelationId {
	return createCustomRecordId(
		'relation',
		`${encodeURIComponent(object)}#${encodeURIComponent(relation)}@${encodeURIComponent(subject)}`
	) as TLRelationId
}

/** @public */
export function createRelation(object: string, relation: string, subject: string): TLRelation {
	return {
		id: createRelationId(object, relation, subject),
		typeName: 'relation',
		object,
		relation,
		subject,
		meta: {},
	}
}
