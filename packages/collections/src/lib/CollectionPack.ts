import type { TLCollectionItemContent } from './schema'

/**
 * A set of items shipped as data, such as starter shapes bundled with an app. The panel's "Browse
 * collections" offers packs, and adding one copies it into the user's collections with
 * {@link copyPack}.
 * @public
 */
export interface CollectionPack {
	/** Stable across versions: a copy of the pack records it. */
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
	/** A preview image's URL, such as a bundled asset or a data URL. */
	thumbnailUrl?: string
}
