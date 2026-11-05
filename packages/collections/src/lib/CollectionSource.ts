import type {
	TLCollection,
	TLCollectionId,
	TLCollectionItem,
	TLCollectionItemContent,
	TLCollectionItemId,
} from './schema'

/**
 * A change a user can try to make. Sources answer {@link CollectionSource.can}.
 *
 * Using items has no action: anything a source lists can be used. A collection someone may not
 * use is simply not listed to them.
 */
export type TLCollectionAction =
	| 'createCollection'
	| 'renameCollection'
	| 'deleteCollection'
	| 'addItem'
	| 'renameItem'
	| 'deleteItem'

/** Someone a collection can belong to, such as a user or a workspace. */
export interface TLCollectionOwner {
	id: string
	name: string
	/**
	 * True when collections can't be created for this owner or moved or copied to it, such as a
	 * pack shipped with an app. Absent means false.
	 */
	readOnly?: boolean
}

/** Choices for a new collection. */
export interface TLNewCollectionOptions {
	/** Who it belongs to. Left out, the source decides, e.g. its default owner. */
	ownerId?: string
}

/** What a source needs to store a new item. */
export interface TLNewCollectionItem {
	/** Optional: adding from the canvas shouldn't force people to name things first. */
	name?: string
	content: TLCollectionItemContent
	/** A rendered preview. Leave it out and the UI shows a placeholder. */
	thumbnail?: Blob
}

/**
 * Where collections come from: tldraw.com workspaces, a prefab pack shipped with an app, the
 * browser. The collections UI only talks to this interface, so it works the same with any of them.
 *
 * The getters are reactive: read them inside a `computed`, `react` or `useValue` and the caller
 * updates when the source changes. Writes are async because most sources save to a server.
 */
export interface CollectionSource {
	readonly id: string

	/** The collections this user may see. */
	getCollections(): TLCollection[]
	getItems(collectionId: TLCollectionId): TLCollectionItem[]
	/** Loads an item's content. Kept separate from the listing because content can be large. */
	getItemContent(itemId: TLCollectionItemId): Promise<TLCollectionItemContent>

	/**
	 * Whether the current user may do `action`. With a `collectionId`, answers for that
	 * collection; without one, for the source as a whole (e.g. may they create collections).
	 */
	can(action: TLCollectionAction, collectionId?: TLCollectionId): boolean

	createCollection(name: string, options?: TLNewCollectionOptions): Promise<TLCollection>
	renameCollection(collectionId: TLCollectionId, name: string): Promise<void>
	deleteCollection(collectionId: TLCollectionId): Promise<void>

	addItem(collectionId: TLCollectionId, item: TLNewCollectionItem): Promise<TLCollectionItem>
	renameItem(itemId: TLCollectionItemId, name: string): Promise<void>
	deleteItem(itemId: TLCollectionItemId): Promise<void>
	/**
	 * Moves an item to another collection, keeping its id, content and thumbnail. Needs
	 * `deleteItem` on the collection it leaves and `addItem` on the one it joins. Optional: the UI
	 * offers "Move to" only for sources that have it.
	 */
	moveItem?(itemId: TLCollectionItemId, toCollectionId: TLCollectionId): Promise<void>

	/**
	 * Who collections can belong to, each collection naming one in its `ownerId`. Listed in the
	 * order the UI should show them, e.g. the user's own first, then their workspaces. Optional:
	 * sources that don't track owners leave it out.
	 */
	getCollectionOwners?(): TLCollectionOwner[]
	/**
	 * Who new collections belong to unless the user picks, such as the owner of the open file. The
	 * UI's "New collection" passes it to {@link CollectionSource.createCollection}. Optional: left
	 * out, or returning undefined, the source decides.
	 */
	getDefaultOwnerId?(): string | undefined
	/**
	 * Gives a collection to another owner. Its items stay in it. Optional: the UI offers "Move to"
	 * only for sources that have it and {@link CollectionSource.getCollectionOwners}, with more than
	 * one owner.
	 */
	moveCollection?(collectionId: TLCollectionId, ownerId: string): Promise<void>
}

/** Thrown by a source when the current user isn't allowed to do something. */
export class CollectionPermissionError extends Error {
	override name = 'CollectionPermissionError'
	constructor(
		readonly action: TLCollectionAction,
		readonly collectionId?: string
	) {
		super(
			collectionId
				? `Not allowed to ${action} in collection ${collectionId}`
				: `Not allowed to ${action}`
		)
	}
}

/** Thrown by a source when a collection, item or owner doesn't exist (any more). */
export class CollectionNotFoundError extends Error {
	override name = 'CollectionNotFoundError'
	constructor(readonly id: string) {
		super(`No collection, item or owner with id ${id}`)
	}
}
