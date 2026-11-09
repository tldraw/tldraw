import type { TLCollectionItemContent, TLCollectionThumbnail } from './schema'

/**
 * A set of items shipped as data, such as starter shapes bundled with an app. {@link copyPack}
 * copies one into a source as an ordinary collection.
 * @public
 */
export interface CollectionPack {
	/** Stable across versions, so a copy can record which pack it came from. */
	id: string
	name: string
	version: number
	items: CollectionPackItem[]
}

/** @public */
export interface CollectionPackItem {
	/** Unique within the pack. */
	id: string
	name?: string
	content: TLCollectionItemContent
	/**
	 * A preview image's URL, such as a bundled asset or a data URL, or a light and a dark one.
	 */
	thumbnail?: TLCollectionThumbnail
}
