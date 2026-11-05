import type { TLContent } from '@tldraw/editor'
import {
	createRecordMigrationSequence,
	createRecordType,
	type BaseRecord,
	type RecordId,
} from '@tldraw/store'
import {
	idValidator,
	shapeIdValidator,
	type CustomRecordInfo,
	type TLAssetId,
} from '@tldraw/tlschema'
import type { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'

export type TLCollectionId = RecordId<TLCollection>

/** A named list of items. Where it is stored is up to the source that provides it. */
export interface TLCollection extends BaseRecord<'collection', TLCollectionId> {
	name: string
	/**
	 * True for collections users can't change, such as a prefab pack shipped with an app.
	 * Sources can leave it out; absent means false.
	 */
	readOnly?: boolean
	/**
	 * Who the collection belongs to, such as a user or a workspace, as the source names them in
	 * `CollectionSource.getCollectionOwners`. What an owner is stays up to the source. Left out by
	 * sources that don't track owners.
	 */
	ownerId?: string
	meta: JsonObject
}

export type TLCollectionItemId = RecordId<TLCollectionItem>

/**
 * An item's preview: one image for every colour mode, or a light and a dark one for apps that have
 * both. `Src` is a URL on a listed item and a `Blob` when adding one.
 */
export type TLCollectionThumbnail<Src = string> = Src | { light: Src; dark: Src }

function isThumbnailPair<Src>(
	thumbnail: TLCollectionThumbnail<Src>
): thumbnail is { light: Src; dark: Src } {
	return typeof thumbnail === 'object' && thumbnail !== null && 'light' in thumbnail
}

/** The image to show in a colour mode. */
export function getThumbnailForColorMode<Src>(
	thumbnail: TLCollectionThumbnail<Src>,
	colorMode: 'light' | 'dark'
): Src {
	return isThumbnailPair(thumbnail) ? thumbnail[colorMode] : thumbnail
}

/** Converts each image of a thumbnail, keeping it a single image or a pair. */
export function mapThumbnail<A, B>(
	thumbnail: TLCollectionThumbnail<A>,
	convert: (src: A) => B
): TLCollectionThumbnail<B> {
	return isThumbnailPair(thumbnail)
		? { light: convert(thumbnail.light), dark: convert(thumbnail.dark) }
		: convert(thumbnail)
}

/**
 * The listing entry for an item. Its content is loaded separately, with
 * `CollectionSource.getItemContent`, so showing a collection never loads every item's shapes and
 * assets.
 */
export interface TLCollectionItem extends BaseRecord<'collection-item', TLCollectionItemId> {
	collectionId: TLCollectionId
	/**
	 * Left out when nobody has named the item: adding from the canvas shouldn't force a name.
	 * The UI decides what to show instead. When present it is never blank.
	 */
	name?: string
	/** Left out when the item has no thumbnail. Its URLs are never blank. */
	thumbnail?: TLCollectionThumbnail
	/**
	 * When the item was saved, in milliseconds since the epoch. Left out by sources that don't
	 * track it; orderings by date put those items last.
	 */
	createdAt?: number
	/** Always 1 for now: items aren't replaced. To change one, delete it and add it again. */
	version: number
	meta: JsonObject
}

export type TLCollectionItemContentRecordId = RecordId<TLCollectionItemContentRecord>

/**
 * An item's content, as a record of its own, for sources that keep collections in a document's
 * store. Kept apart from the item so listing a collection never reads shapes, and keyed by the
 * item's id so finding it needs no index.
 *
 * Assets are not copied in: `assetIds` names asset records that sit in the same store, so whatever
 * the document does with its assets (uploading them, copying them along with a duplicated file)
 * happens to these too. The shapes stay at the schema they were saved with, in `content.schema`,
 * and are migrated when the content is loaded.
 */
export interface TLCollectionItemContentRecord extends BaseRecord<
	'collection-item-content',
	TLCollectionItemContentRecordId
> {
	itemId: TLCollectionItemId
	content: Omit<TLContent, 'assets'>
	assetIds: TLAssetId[]
	meta: JsonObject
}

export type TLCollectionRecord = TLCollection | TLCollectionItem | TLCollectionItemContentRecord

const nonEmptyString = T.string.check((value) => {
	if (value.trim().length === 0) throw new T.ValidationError('Expected a non-empty string')
})

export const collectionValidator: T.Validator<TLCollection> = T.object({
	id: idValidator<TLCollectionId>('collection'),
	typeName: T.literal('collection'),
	name: nonEmptyString,
	readOnly: T.boolean.optional(),
	ownerId: nonEmptyString.optional(),
	meta: T.jsonValue as T.ObjectValidator<JsonObject>,
})

export const collectionItemValidator: T.Validator<TLCollectionItem> = T.object({
	id: idValidator<TLCollectionItemId>('collection-item'),
	typeName: T.literal('collection-item'),
	collectionId: idValidator<TLCollectionId>('collection'),
	name: nonEmptyString.optional(),
	thumbnail: T.or(
		nonEmptyString,
		T.object({ light: nonEmptyString, dark: nonEmptyString })
	).optional(),
	createdAt: T.number.optional(),
	version: T.positiveInteger,
	meta: T.jsonValue as T.ObjectValidator<JsonObject>,
})

export const CollectionRecordType = createRecordType<TLCollection>('collection', {
	validator: collectionValidator,
	scope: 'document',
}).withDefaultProperties(() => ({ meta: {} }))

export const CollectionItemRecordType = createRecordType<TLCollectionItem>('collection-item', {
	validator: collectionItemValidator,
	scope: 'document',
}).withDefaultProperties(() => ({ version: 1, meta: {} }))

// Only the envelope is checked here, as for content handed to a source: see contentValidator.
const storedContentValidator = T.object({
	shapes: T.arrayOf(T.unknownObject),
	bindings: T.arrayOf(T.unknownObject).optional(),
	rootShapeIds: T.arrayOf(shapeIdValidator),
	schema: T.unknownObject,
	users: T.arrayOf(T.unknownObject).optional(),
}) as T.Validator<unknown> as T.Validator<Omit<TLContent, 'assets'>>

export const collectionItemContentValidator: T.Validator<TLCollectionItemContentRecord> = T.object({
	id: idValidator<TLCollectionItemContentRecordId>('collection-item-content'),
	typeName: T.literal('collection-item-content'),
	itemId: idValidator<TLCollectionItemId>('collection-item'),
	content: storedContentValidator,
	assetIds: T.arrayOf(idValidator<TLAssetId>('asset')),
	meta: T.jsonValue as T.ObjectValidator<JsonObject>,
})

export const CollectionItemContentRecordType = createRecordType<TLCollectionItemContentRecord>(
	'collection-item-content',
	{ validator: collectionItemContentValidator, scope: 'document' }
).withDefaultProperties(() => ({ meta: {} }))

/** The id of the content record for an item: the item's own id, under the content type. */
export function getCollectionItemContentId(
	itemId: TLCollectionItemId
): TLCollectionItemContentRecordId {
	return CollectionItemContentRecordType.createId(itemId.slice('collection-item:'.length))
}

export const collectionMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.collection',
	recordType: 'collection',
	sequence: [],
})

export const collectionItemMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.collection-item',
	recordType: 'collection-item',
	sequence: [],
})

export const collectionItemContentMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.collection-item-content',
	recordType: 'collection-item-content',
	sequence: [],
})

/**
 * The `records` map that lets a tldraw store hold collections, for `createTLSchema` on a sync
 * server and the `records` option on the client. Register it on both sides, or the client and
 * server schemas won't match.
 */
export const collectionSchemaRecords = {
	collection: {
		scope: 'document',
		validator: collectionValidator,
		migrations: collectionMigrations,
		createDefaultProperties: () => ({ meta: {} }),
	},
	'collection-item': {
		scope: 'document',
		validator: collectionItemValidator,
		migrations: collectionItemMigrations,
		createDefaultProperties: () => ({ version: 1, meta: {} }),
	},
	'collection-item-content': {
		scope: 'document',
		validator: collectionItemContentValidator,
		migrations: collectionItemContentMigrations,
		createDefaultProperties: () => ({ meta: {} }),
	},
} satisfies Record<TLCollectionRecord['typeName'], CustomRecordInfo>

/** The newest item content format this version of the package can read. */
export const CURRENT_ITEM_CONTENT_FORMAT_VERSION = 1

/**
 * The shapes an item places, in a versioned envelope. Anything an item needs beyond shapes
 * arrives as a new `formatVersion`, so the way collections are listed and stored doesn't change.
 */
export interface TLCollectionItemContent {
	formatVersion: 1
	content: TLContent
}

// Only the envelope is checked here. The records inside are migrated and validated by the
// editor's store schema when the content is placed (putContentOntoCurrentPage), which is the
// only place that knows the shape, binding and asset types the app registered.
const contentValidator = T.object({
	shapes: T.arrayOf(T.unknownObject),
	bindings: T.arrayOf(T.unknownObject).optional(),
	rootShapeIds: T.arrayOf(shapeIdValidator),
	assets: T.arrayOf(T.unknownObject),
	schema: T.unknownObject,
	users: T.arrayOf(T.unknownObject).optional(),
}) as T.Validator<unknown> as T.Validator<TLContent>

const itemContentValidator: T.Validator<TLCollectionItemContent> = T.object({
	formatVersion: T.literal(1),
	content: contentValidator,
})

const formatVersionValidator = T.object({
	formatVersion: T.positiveInteger,
}).allowUnknownProperties()

/**
 * Thrown when item content was written by a newer version of the package. Reading it anyway
 * would silently drop whatever the newer format added, so callers should ask for an update.
 */
export class CollectionItemContentTooNewError extends Error {
	override name = 'CollectionItemContentTooNewError'
	constructor(readonly formatVersion: number) {
		super(
			`Collection item content has format version ${formatVersion}, but this version of @tldraw/collections only reads up to ${CURRENT_ITEM_CONTENT_FORMAT_VERSION}.`
		)
	}
}

/** Validates item content loaded from a source. Migrating older formats belongs here. */
export function parseCollectionItemContent(value: unknown): TLCollectionItemContent {
	const { formatVersion } = formatVersionValidator.validate(value)
	if (formatVersion > CURRENT_ITEM_CONTENT_FORMAT_VERSION) {
		throw new CollectionItemContentTooNewError(formatVersion)
	}
	return itemContentValidator.validate(value)
}
