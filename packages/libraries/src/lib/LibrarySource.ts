import type { TLLibrary, TLLibraryId, TLLibraryItemId, TLLibraryThumbnail } from '@tldraw/tlschema'
import type { JsonObject } from '@tldraw/utils'
import type { TLLibraryItem, TLLibraryItemContent } from './schema'

/**
 * A change a user can try to make. Sources answer {@link LibrarySource.can}.
 *
 * Using items has no action: anything a source lists can be used. A library someone may not
 * use is simply not listed to them.
 */
export type TLLibraryAction =
	| 'createLibrary'
	| 'renameLibrary'
	| 'deleteLibrary'
	| 'addItem'
	| 'renameItem'
	| 'deleteItem'

/**
 * What {@link LibrarySource.can} answers for: a library, by its id, or an owner, by
 * `{ ownerId }`, e.g. whether a library may be created for that owner.
 */
export type TLLibraryTarget = TLLibraryId | { ownerId: string }

/** Something a library can belong to, such as a user or a workspace. */
export interface TLLibraryOwner {
	id: string
	name: string
}

/** Choices for a new library. */
export interface TLNewLibraryOptions {
	/** Who it belongs to. Left out, the source decides, e.g. its default owner. */
	ownerId?: string
	/** Stored on the library as its `meta`, e.g. the pack it was copied from. */
	meta?: JsonObject
}

/** What a source needs to store a new item. */
export interface TLNewLibraryItem {
	/** Optional: adding from the canvas shouldn't force people to name things first. */
	name?: string
	content: TLLibraryItemContent
	/**
	 * A rendered preview, or a light and a dark one for an app with both modes. Leave it out and the
	 * UI shows a placeholder.
	 */
	thumbnail?: TLLibraryThumbnail<Blob>
}

/**
 * What a tile needs from a thumbnail, passed to {@link LibrarySource.resolveThumbnail}. The panel
 * builds it each time it asks.
 */
export interface TLLibraryThumbnailContext {
	colorMode: 'light' | 'dark'
	/**
	 * The tile's width in CSS pixels, rounded up to a power of two so that resizing the panel rarely
	 * asks again.
	 */
	width: number
	/** The screen's pixel ratio, at most 2: at tile size, 3× isn't visibly sharper. */
	dpr: number
	/** The browser's estimate of the connection, such as `'4g'`, or null where it gives none. */
	networkEffectiveType: string | null
}

/**
 * Where libraries come from: tldraw.com workspaces, a prefab pack shipped with an app, the
 * browser. The libraries UI only talks to this interface, so it works the same with any of them.
 *
 * The getters are reactive: read them inside a `computed`, `react` or `useValue` and the caller
 * updates when the source changes. Writes are async because most sources save to a server.
 */
export interface LibrarySource {
	readonly id: string

	/** The libraries this user may see. */
	getLibraries(): TLLibrary[]
	getItems(libraryId: TLLibraryId): TLLibraryItem[]
	/** Loads an item's content. Kept separate from the listing because content can be large. */
	getItemContent(itemId: TLLibraryItemId): Promise<TLLibraryItemContent>
	/**
	 * Whether a library's items are still on their way, e.g. while its file downloads. The panel
	 * shows placeholder tiles meanwhile. Optional: without it, a library with no items shows as
	 * empty.
	 */
	isLoading?(libraryId: TLLibraryId): boolean
	/**
	 * The URL of an item's thumbnail, sized for its tile, or null for none. Optional: without it,
	 * tiles show the item's `thumbnail` for the editor's colour mode.
	 *
	 * Called for every item of the library on show, and again when the item or the context
	 * changes, so answer quickly. A source that makes `blob:` URLs here owns them: keep one per item and size,
	 * and revoke them when the source is thrown away.
	 */
	resolveThumbnail?(
		item: TLLibraryItem,
		context: TLLibraryThumbnailContext
	): string | null | Promise<string | null>

	/**
	 * Whether the current user may do `action`. With a library id, answers for that library;
	 * with `{ ownerId }`, for that owner (e.g. may they create libraries for it); with neither,
	 * for the source as a whole (e.g. may they create libraries).
	 */
	can(action: TLLibraryAction, target?: TLLibraryTarget): boolean

	createLibrary(name: string, options?: TLNewLibraryOptions): Promise<TLLibrary>
	renameLibrary(libraryId: TLLibraryId, name: string): Promise<void>
	deleteLibrary(libraryId: TLLibraryId): Promise<void>

	addItem(libraryId: TLLibraryId, item: TLNewLibraryItem): Promise<TLLibraryItem>
	renameItem(itemId: TLLibraryItemId, name: string): Promise<void>
	deleteItem(itemId: TLLibraryItemId): Promise<void>
	/**
	 * Moves an item to another library, keeping its id, content and thumbnail. Needs
	 * `deleteItem` on the library it leaves and `addItem` on the one it joins. Optional: the UI
	 * offers "Move to" only for sources that have it.
	 */
	moveItem?(itemId: TLLibraryItemId, toLibraryId: TLLibraryId): Promise<void>

	/**
	 * Who libraries can belong to, each library naming one in its `ownerId`. Listed in the
	 * order the UI should show them, e.g. the user's own first, then their workspaces. Optional:
	 * sources that don't track owners leave it out.
	 */
	getLibraryOwners?(): TLLibraryOwner[]
	/**
	 * Who new libraries belong to unless the user picks, such as the owner of the open file. The
	 * UI's "New library" passes it to {@link LibrarySource.createLibrary}. Optional: left
	 * out, or returning undefined, the source decides.
	 */
	getDefaultOwnerId?(): string | undefined
	/**
	 * Gives a library to another owner. Its items stay in it. Optional: sources that don't track
	 * owners, or can't move libraries between them, leave it out.
	 */
	moveLibrary?(libraryId: TLLibraryId, ownerId: string): Promise<void>
	/**
	 * Copies a library and its items to an owner, as a new library with the same name, and
	 * returns the copy. Optional: for sources that can copy without the caller loading and adding
	 * every item again, e.g. on a server. Without it, `copyLibrary` copies item by item through
	 * {@link LibrarySource.getItemContent} and {@link LibrarySource.addItem}.
	 */
	copyLibrary?(libraryId: TLLibraryId, ownerId: string): Promise<TLLibrary>
}

/** Thrown by a source when the current user isn't allowed to do something. */
export class LibraryPermissionError extends Error {
	override name = 'LibraryPermissionError'
	constructor(
		readonly action: TLLibraryAction,
		readonly libraryId?: string
	) {
		super(
			libraryId ? `Not allowed to ${action} in library ${libraryId}` : `Not allowed to ${action}`
		)
	}
}

/** Thrown by a source when a library, item or owner doesn't exist (any more). */
export class LibraryNotFoundError extends Error {
	override name = 'LibraryNotFoundError'
	constructor(readonly id: string) {
		super(`No library, item or owner with id ${id}`)
	}
}
