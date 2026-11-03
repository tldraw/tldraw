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

	createCollection(name: string): Promise<TLCollection>
	renameCollection(collectionId: TLCollectionId, name: string): Promise<void>
	deleteCollection(collectionId: TLCollectionId): Promise<void>

	addItem(collectionId: TLCollectionId, item: TLNewCollectionItem): Promise<TLCollectionItem>
	renameItem(itemId: TLCollectionItemId, name: string): Promise<void>
	deleteItem(itemId: TLCollectionItemId): Promise<void>
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

/** Thrown by a source when a collection or item doesn't exist (any more). */
export class CollectionNotFoundError extends Error {
	override name = 'CollectionNotFoundError'
	constructor(readonly id: string) {
		super(`No collection or item with id ${id}`)
	}
}
