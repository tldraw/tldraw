import {
	BaseRecord,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
	SerializedSchema,
} from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { TLAssetId } from './TLAsset'
import { TLBinding } from './TLBinding'
import { CustomRecordInfo } from './TLCustomRecord'
import { TLShape, TLShapeId } from './TLShape'
import { TLUser } from './TLUser'

/** @internal */
export type TLLibraryId = RecordId<TLLibrary>

/**
 * A named list of items. Where it is stored is up to the source that provides it.
 *
 * Libraries kept in a document are opt-in: register `librarySchemaRecords` with
 * `createTLSchema({ records })` on the server and the matching `records` option on the client.
 *
 * @internal
 */
export interface TLLibrary extends BaseRecord<'library', TLLibraryId> {
	name: string
	/**
	 * Who the library belongs to, such as a user or a workspace, as the source names them in
	 * `LibrarySource.getLibraryOwners`. What an owner is stays up to the source. Left out by
	 * sources that don't track owners.
	 */
	ownerId?: string
	meta: JsonObject
}

/**
 * An item's preview: one image for every colour mode, or a light and a dark one for apps that have
 * both. `Src` is what names each image: an asset id on a stored item, a URL on a listed one, a
 * `Blob` when adding one.
 *
 * @internal
 */
export type TLLibraryThumbnail<Src = string> = Src | { light: Src; dark: Src }

/** @internal */
export type TLLibraryItemId = RecordId<TLLibraryItemRecord>

/**
 * An item as a record in a document's store. Its thumbnail names image asset records in the same
 * store, so the images are uploaded, synced and copied like any other asset in the document. Its
 * content is a separate {@link TLLibraryItemContentRecord}, so listing a library never reads
 * shapes.
 *
 * @internal
 */
export interface TLLibraryItemRecord extends BaseRecord<'library-item', TLLibraryItemId> {
	libraryId: TLLibraryId
	/** Left out when nobody has named the item. When present it is never blank. */
	name?: string
	/** Left out when the item has no thumbnail. */
	thumbnail?: TLLibraryThumbnail<TLAssetId>
	/** When the item was saved, in milliseconds since the epoch. */
	createdAt?: number
	/** Always 1 for now: items aren't replaced. To change one, delete it and add it again. */
	version: number
	meta: JsonObject
}

/** @internal */
export type TLLibraryItemContentRecordId = RecordId<TLLibraryItemContentRecord>

/**
 * An item's content, as a record of its own, keyed by the item's id (see
 * {@link createLibraryItemContentId}) so finding it needs no index.
 *
 * Assets are not copied in: `assetIds` names asset records in the same store, so whatever the
 * document does with its assets happens to these too. The shapes stay at the schema they were
 * saved with, in `content.schema`, and are migrated when the content is loaded.
 *
 * @internal
 */
export interface TLLibraryItemContentRecord extends BaseRecord<
	'library-item-content',
	TLLibraryItemContentRecordId
> {
	itemId: TLLibraryItemId
	content: {
		shapes: TLShape[]
		bindings?: TLBinding[]
		rootShapeIds: TLShapeId[]
		schema: SerializedSchema
		users?: TLUser[]
	}
	assetIds: TLAssetId[]
	meta: JsonObject
}

/** @internal */
export type TLLibraryRecord = TLLibrary | TLLibraryItemRecord | TLLibraryItemContentRecord

const nonEmptyString = T.string.check((value) => {
	if (value.trim().length === 0) throw new T.ValidationError('Expected a non-empty string')
})

const assetIdValidator = idValidator<TLAssetId>('asset')

/** @internal */
export const libraryValidator: T.Validator<TLLibrary> = T.object({
	id: idValidator<TLLibraryId>('library'),
	typeName: T.literal('library'),
	name: nonEmptyString,
	ownerId: nonEmptyString.optional(),
	meta: T.jsonValue as T.ObjectValidator<JsonObject>,
})

/** @internal */
export const libraryItemRecordValidator: T.Validator<TLLibraryItemRecord> = T.object({
	id: idValidator<TLLibraryItemId>('library-item'),
	typeName: T.literal('library-item'),
	libraryId: idValidator<TLLibraryId>('library'),
	name: nonEmptyString.optional(),
	thumbnail: T.or(
		assetIdValidator,
		T.object({ light: assetIdValidator, dark: assetIdValidator })
	).optional(),
	createdAt: T.number.optional(),
	version: T.positiveInteger,
	meta: T.jsonValue as T.ObjectValidator<JsonObject>,
})

// Only the envelope is checked. The records inside are at the schema they were saved with, and
// are migrated and validated against the app's schema when the content is loaded.
const storedContentValidator = T.object({
	shapes: T.arrayOf(T.unknownObject),
	bindings: T.arrayOf(T.unknownObject).optional(),
	rootShapeIds: T.arrayOf(idValidator<TLShapeId>('shape')),
	schema: T.unknownObject,
	users: T.arrayOf(T.unknownObject).optional(),
}) as T.Validator<unknown> as T.Validator<TLLibraryItemContentRecord['content']>

/** @internal */
export const libraryItemContentValidator: T.Validator<TLLibraryItemContentRecord> = T.object({
	id: idValidator<TLLibraryItemContentRecordId>('library-item-content'),
	typeName: T.literal('library-item-content'),
	itemId: idValidator<TLLibraryItemId>('library-item'),
	content: storedContentValidator,
	assetIds: T.arrayOf(assetIdValidator),
	meta: T.jsonValue as T.ObjectValidator<JsonObject>,
})

/**
 * Guard migrations, as for comments: each sequence starts with an identity migration that has no
 * `down`, so a session whose schema predates the library types is rejected with CLIENT_TOO_OLD
 * instead of being sent records its store can't represent.
 */
function createLibraryGuardMigrations(typeName: TLLibraryRecord['typeName']) {
	return createRecordMigrationSequence({
		sequenceId: `com.tldraw.${typeName}`,
		recordType: typeName,
		retroactive: true,
		sequence: [{ id: `com.tldraw.${typeName}/1`, up: (record) => record }],
	})
}

/** @internal */
export const LibraryRecordType = createRecordType<TLLibrary>('library', {
	validator: libraryValidator,
	scope: 'document',
}).withDefaultProperties(() => ({ meta: {} }))

/** @internal */
export const LibraryItemContentRecordType = createRecordType<TLLibraryItemContentRecord>(
	'library-item-content',
	{ validator: libraryItemContentValidator, scope: 'document' }
).withDefaultProperties(() => ({ meta: {} }))

/**
 * The `records` map to pass to `createTLSchema` / the client `records` option so a document can
 * hold libraries. Register the types together, and identically on both sides of a connection.
 *
 * @internal
 */
export const librarySchemaRecords = {
	library: {
		scope: 'document',
		validator: libraryValidator,
		migrations: createLibraryGuardMigrations('library'),
		createDefaultProperties: () => ({ meta: {} }),
	},
	'library-item': {
		scope: 'document',
		validator: libraryItemRecordValidator,
		migrations: createLibraryGuardMigrations('library-item'),
		createDefaultProperties: () => ({ version: 1, meta: {} }),
	},
	'library-item-content': {
		scope: 'document',
		validator: libraryItemContentValidator,
		migrations: createLibraryGuardMigrations('library-item-content'),
		createDefaultProperties: () => ({ meta: {} }),
	},
} satisfies Record<TLLibraryRecord['typeName'], CustomRecordInfo>

/**
 * The id of an item's content record: the item's own id, under the content type.
 *
 * @internal
 */
export function createLibraryItemContentId(itemId: TLLibraryItemId): TLLibraryItemContentRecordId {
	return LibraryItemContentRecordType.createId(itemId.slice('library-item:'.length))
}
