import type { TLLibraryThumbnail } from '@tldraw/tlschema'
import type { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import {
	libraryThumbnailValidator,
	nonEmptyString,
	parseLibraryItemContent,
	type TLLibraryItemContent,
} from './schema'

/**
 * A set of items shipped as data, such as starter shapes bundled with an app. {@link copyPack}
 * copies one into a source as an ordinary library.
 * @public
 */
export interface LibraryPack {
	/** Stable across versions. {@link copyPack} records it on the copy's `meta` as `packId`. */
	id: string
	name: string
	/** {@link copyPack} records it on the copy's `meta` as `packVersion`. */
	version: number
	items: LibraryPackItem[]
}

/** @public */
export interface LibraryPackItem {
	/** Unique within the pack. */
	id: string
	name?: string
	content: TLLibraryItemContent
	/**
	 * A preview image's URL, such as a bundled asset or a data URL, or a light and a dark one.
	 */
	thumbnail?: TLLibraryThumbnail
	/** {@link copyPack} stores it on the item's copy as its `meta`. */
	meta?: JsonObject
}

const libraryPackItemValidator: T.Validator<LibraryPackItem> = T.object({
	id: nonEmptyString,
	name: nonEmptyString.optional(),
	content: T.unknown as T.Validator<TLLibraryItemContent>,
	thumbnail: libraryThumbnailValidator.optional(),
	meta: (T.jsonValue as T.Validator<JsonObject>).optional(),
})

const libraryPackValidator: T.Validator<LibraryPack> = T.object({
	id: nonEmptyString,
	name: nonEmptyString,
	version: T.positiveInteger,
	items: T.arrayOf(libraryPackItemValidator),
})

/**
 * Validates a pack loaded as data, such as a bundled JSON file: its envelope, and each item's
 * fields and content (see {@link parseLibraryItemContent}, whose errors, such as
 * {@link LibraryItemContentTooNewError}, it throws as they are). Like that, it doesn't migrate or
 * validate the records inside an item's content; the editor's store schema does that when the
 * content is placed.
 * @public
 */
export function parseLibraryPack(value: unknown): LibraryPack {
	const pack = libraryPackValidator.validate(value)
	return {
		...pack,
		items: pack.items.map((item) => ({ ...item, content: parseLibraryItemContent(item.content) })),
	}
}
