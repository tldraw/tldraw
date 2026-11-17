import type { TLContent } from '@tldraw/editor'
import { createRecordType, type BaseRecord } from '@tldraw/store'
import {
	idValidator,
	shapeIdValidator,
	type TLLibraryId,
	type TLLibraryItemId,
	type TLLibraryThumbnail,
} from '@tldraw/tlschema'
import type { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'

function isThumbnailPair<Src>(
	thumbnail: TLLibraryThumbnail<Src>
): thumbnail is { light: Src; dark: Src } {
	return typeof thumbnail === 'object' && thumbnail !== null && 'light' in thumbnail
}

/** The image to show in a colour mode. */
export function getThumbnailForColorMode<Src>(
	thumbnail: TLLibraryThumbnail<Src>,
	colorMode: 'light' | 'dark'
): Src {
	return isThumbnailPair(thumbnail) ? thumbnail[colorMode] : thumbnail
}

/** Converts each image of a thumbnail, keeping it a single image or a pair. */
export function mapThumbnail<A, B>(
	thumbnail: TLLibraryThumbnail<A>,
	convert: (src: A) => B
): TLLibraryThumbnail<B> {
	return isThumbnailPair(thumbnail)
		? { light: convert(thumbnail.light), dark: convert(thumbnail.dark) }
		: convert(thumbnail)
}

/**
 * The listing entry for an item. Its content is loaded separately, with
 * `LibrarySource.getItemContent`, so showing a library never loads every item's shapes and
 * assets.
 */
export interface TLLibraryItem extends BaseRecord<'library-item', TLLibraryItemId> {
	libraryId: TLLibraryId
	/**
	 * Left out when nobody has named the item: adding from the canvas shouldn't force a name.
	 * The UI decides what to show instead. When present it is never blank.
	 */
	name?: string
	/** Left out when the item has no thumbnail. Its URLs are never blank. */
	thumbnail?: TLLibraryThumbnail
	/**
	 * When the item was saved, in milliseconds since the epoch. Left out by sources that don't
	 * track it; orderings by date put those items last.
	 */
	createdAt?: number
	/** Always 1 for now: items aren't replaced. To change one, delete it and add it again. */
	version: number
	meta: JsonObject
}

const nonEmptyString = T.string.check((value) => {
	if (value.trim().length === 0) throw new T.ValidationError('Expected a non-empty string')
})

export const libraryItemValidator: T.Validator<TLLibraryItem> = T.object({
	id: idValidator<TLLibraryItemId>('library-item'),
	typeName: T.literal('library-item'),
	libraryId: idValidator<TLLibraryId>('library'),
	name: nonEmptyString.optional(),
	thumbnail: T.or(
		nonEmptyString,
		T.object({ light: nonEmptyString, dark: nonEmptyString })
	).optional(),
	createdAt: T.number.optional(),
	version: T.positiveInteger,
	meta: T.jsonValue as T.ObjectValidator<JsonObject>,
})

/** The item with an `updateItem` partial applied: meta merged key by key, as shapes' is. */
export function applyLibraryItemPartial<T extends TLLibraryItem>(
	item: T,
	partial: Partial<Pick<TLLibraryItem, 'name' | 'meta'>>
): T {
	return {
		...item,
		...(partial.name === undefined ? {} : { name: partial.name }),
		...(partial.meta === undefined ? {} : { meta: { ...item.meta, ...partial.meta } }),
	}
}

export const LibraryItemRecordType = createRecordType<TLLibraryItem>('library-item', {
	validator: libraryItemValidator,
	scope: 'document',
}).withDefaultProperties(() => ({ version: 1, meta: {} }))

/** The newest item content format this version of the package can read. */
export const CURRENT_ITEM_CONTENT_FORMAT_VERSION = 1

/**
 * The shapes an item places, in a versioned envelope. Anything an item needs beyond shapes
 * arrives as a new `formatVersion`, so the way libraries are listed and stored doesn't change.
 */
export interface TLLibraryItemContent {
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

const itemContentValidator: T.Validator<TLLibraryItemContent> = T.object({
	formatVersion: T.literal(1),
	content: contentValidator,
})

const formatVersionValidator = T.object({
	formatVersion: T.positiveInteger,
}).allowUnknownProperties()

/**
 * Thrown when item content was written by a newer version of tldraw than this one: its format is
 * newer than this package reads, its shapes were saved at schema versions the editor can't migrate
 * down from, or it has a shape or binding type the editor has no util for. Reading it anyway would
 * drop or break whatever the newer version added, so callers should ask for an update.
 */
export class LibraryItemContentTooNewError extends Error {
	override name = 'LibraryItemContentTooNewError'
	/** The content's format version, when the format is what's too new. */
	readonly formatVersion?: number
	constructor(reason: { formatVersion: number } | { message: string }) {
		super(
			'formatVersion' in reason
				? `Library item content has format version ${reason.formatVersion}, but this version of @tldraw/libraries only reads up to ${CURRENT_ITEM_CONTENT_FORMAT_VERSION}.`
				: reason.message
		)
		if ('formatVersion' in reason) this.formatVersion = reason.formatVersion
	}
}

/** Validates item content loaded from a source. Migrating older formats belongs here. */
export function parseLibraryItemContent(value: unknown): TLLibraryItemContent {
	const { formatVersion } = formatVersionValidator.validate(value)
	if (formatVersion > CURRENT_ITEM_CONTENT_FORMAT_VERSION) {
		throw new LibraryItemContentTooNewError({ formatVersion })
	}
	return itemContentValidator.validate(value)
}
