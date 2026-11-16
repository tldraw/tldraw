import type { TLLibraryThumbnail } from '@tldraw/tlschema'
import type { JsonObject } from '@tldraw/utils'
import type { TLLibraryItemContent } from './schema'

/**
 * A set of items shipped as data, such as starter shapes bundled with an app, and optionally
 * libraries inside it, such as categories. {@link copyPack} copies one into a source as an ordinary
 * library, with the libraries inside it.
 * @public
 */
export interface LibraryPack {
	/** Stable across versions. {@link copyPack} records it on the copy's `meta` as `packId`. */
	id: string
	name: string
	/** {@link copyPack} records it on the copy's `meta` as `packVersion`. */
	version: number
	items: LibraryPackItem[]
	/** Libraries inside the pack's, listed after its items. */
	libraries?: LibraryPackLibrary[]
}

/**
 * A library inside a pack, or inside another such library.
 * @public
 */
export interface LibraryPackLibrary {
	/** Unique within the pack, among its libraries. */
	id: string
	name: string
	items: LibraryPackItem[]
	libraries?: LibraryPackLibrary[]
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
