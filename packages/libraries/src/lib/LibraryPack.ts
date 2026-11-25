import type { TLLibraryThumbnail } from '@tldraw/tlschema'
import type { TLLibraryItemContent } from './schema'

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
}
