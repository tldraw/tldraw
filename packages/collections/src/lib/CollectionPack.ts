import type { TLCollectionItemContent, TLCollectionThumbnail } from './schema'

/**
 * A set of items shipped as data, such as starter shapes bundled with an app. A
 * {@link PackCollectionSource} lists each pack as a read-only collection.
 * @public
 */
export interface CollectionPack {
	/** Stable across versions: the pack's collection id is derived from it. */
	id: string
	name: string
	version: number
	items: CollectionPackItem[]
}

/** @public */
export interface CollectionPackItem {
	/** Unique within the pack and stable across versions: the item's id is derived from it. */
	id: string
	name?: string
	content: TLCollectionItemContent
	/**
	 * A preview image's URL, such as a bundled asset or a data URL, or a light and a dark one.
	 */
	thumbnail?: TLCollectionThumbnail
}
