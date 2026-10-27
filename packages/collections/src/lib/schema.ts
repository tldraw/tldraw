import type { TLContent } from '@tldraw/editor'
import { shapeIdValidator } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

/** A named list of items. Where it is stored is up to the source that provides it. */
export interface TLCollection {
	id: string
	name: string
	/**
	 * True for collections users can't change, such as a prefab pack shipped with an app.
	 * Sources can leave it out; absent means false.
	 */
	readOnly?: boolean
}

/**
 * The listing entry for an item. Its content is loaded separately with
 * {@link parseCollectionItemContent}, so showing a collection never loads every item's shapes
 * and assets.
 */
export interface TLCollectionItem {
	id: string
	collectionId: string
	/**
	 * Left out when nobody has named the item: adding from the canvas shouldn't force a name.
	 * The UI decides what to show instead. When present it is never blank.
	 */
	name?: string
	/** Left out when the item has no thumbnail. When present it is never blank. */
	thumbnailUrl?: string
	/** Always 1 for now: items aren't replaced. To change one, delete it and add it again. */
	version: number
}

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

const nonEmptyString = T.string.check((value) => {
	if (value.trim().length === 0) throw new T.ValidationError('Expected a non-empty string')
})

export const collectionValidator: T.Validator<TLCollection> = T.object({
	id: nonEmptyString,
	name: nonEmptyString,
	readOnly: T.boolean.optional(),
})

export const collectionItemValidator: T.Validator<TLCollectionItem> = T.object({
	id: nonEmptyString,
	collectionId: nonEmptyString,
	name: nonEmptyString.optional(),
	thumbnailUrl: nonEmptyString.optional(),
	version: T.positiveInteger,
})

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
