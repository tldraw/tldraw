import type { CollectionPack } from './CollectionPack'
import type { TLCollectionId } from './schema'

/**
 * The packs a user can add to their panel and remove again. The panel's "Browse collections…"
 * lists them, and an added pack's ⋯ menu offers "Remove from panel". {@link PackCollectionSource}
 * is one.
 * @public
 */
export interface PackCatalogue {
	/** Every pack on offer, added or not, in the order to list them. */
	getPacks(): readonly CollectionPack[]
	/** Reactive. */
	isPackAdded(packId: string): boolean
	/** Ignores a pack that isn't on offer. */
	addPack(packId: string): void
	removePack(packId: string): void
	/** The pack a collection lists, or undefined for a collection that isn't a pack. */
	getPackId(collectionId: TLCollectionId): string | undefined
}
