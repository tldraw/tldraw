import type { TLLibrary, TLLibraryId, TLLibraryItemId, TLLibraryThumbnail } from '@tldraw/tlschema'
import type { JsonObject } from '@tldraw/utils'
import type { TLUiIconJsx, TLUiIconType } from 'tldraw'
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
	| 'updateItem'
	| 'deleteItem'
	| 'addLibraryToDocument'
	| 'removeLibraryFromDocument'

/**
 * What {@link LibrarySource.can} answers for: a library, by its id, or an owner, by
 * `{ ownerId }`, e.g. whether a library may be created for that owner.
 */
export type TLLibraryTarget = TLLibraryId | { ownerId: string }

/**
 * Why a library is shown in the document, answered by {@link LibrarySource.getLibraryPlacement}:
 *
 * - `'housed'`: it is kept in the document itself, and goes wherever the document goes.
 * - `'added'`: it is kept elsewhere, such as in a workspace, and was added to the document.
 * - `'default'`: it is the user's own default library, shown in every document they open.
 */
export type TLLibraryPlacement = 'housed' | 'added' | 'default'

/** Something a library can belong to, such as a user or a workspace. */
export interface TLLibraryOwner {
	id: string
	name: string
	/** Shown before the name on the owner's tab in the libraries panel. */
	icon?: TLUiIconType | Exclude<string, TLUiIconType> | TLUiIconJsx
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
	/** Stored on the item as its `meta`, e.g. the category it had in the pack it was copied from. */
	meta?: JsonObject
}

/**
 * The changes {@link LibrarySource.updateItem} makes to an item. Fields left out stay as they are.
 */
export type TLLibraryItemPartial = Partial<Pick<TLLibraryItem, 'name' | 'meta'>>

/**
 * What a source knows about an item beyond its listing, shown in its details. Every field is
 * optional: the details leave out what a source doesn't know.
 */
export interface TLLibraryItemDetails {
	/** The name to show for whoever saved the item. */
	creatorName?: string
	description?: string
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

	/**
	 * The libraries shown in this document. For a source where libraries are added to a document,
	 * these are the ones housed in it, added to it and the user's default (see
	 * {@link LibrarySource.getLibraryPlacement}); the rest the user may add are
	 * {@link LibrarySource.getAvailableLibraries}.
	 */
	getLibraries(): TLLibrary[]
	getItems(libraryId: TLLibraryId): TLLibraryItem[]
	/** Loads an item's content. Kept separate from the listing because content can be large. */
	getItemContent(itemId: TLLibraryItemId): Promise<TLLibraryItemContent>
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
	 * What the source knows about an item beyond its listing, such as who saved it. Optional:
	 * without it, an item's details show what its listing has. Reactive, like the other getters.
	 */
	getItemDetails?(item: TLLibraryItem): TLLibraryItemDetails

	/**
	 * Whether the current user may do `action`. With a library id, answers for that library;
	 * with `{ ownerId }`, for that owner (e.g. may they create libraries for it); with neither,
	 * for the source as a whole (e.g. may they create libraries).
	 */
	can(action: TLLibraryAction, target?: TLLibraryTarget): boolean

	/**
	 * Creates a library, listed in {@link LibrarySource.getLibraries} once it resolves: a source
	 * where libraries are added to a document adds the new one to it. So does
	 * {@link LibrarySource.copyLibrary} for the copy.
	 */
	createLibrary(name: string, options?: TLNewLibraryOptions): Promise<TLLibrary>
	renameLibrary(libraryId: TLLibraryId, name: string): Promise<void>
	deleteLibrary(libraryId: TLLibraryId): Promise<void>

	/**
	 * Adds an item to a library, and resolves with it once it is listed. A source may go on saving
	 * it after that, e.g. while its thumbnail uploads, as a pasted image does; if saving fails, the
	 * source removes the item again and reports the failure itself.
	 */
	addItem(libraryId: TLLibraryId, item: TLNewLibraryItem): Promise<TLLibraryItem>
	/**
	 * Adds several items to a library, in the order given, as one change where the source can, and
	 * resolves with them in the same order once they are listed, as {@link LibrarySource.addItem}
	 * does. Optional: for sources where adding items together is quicker than adding them one at a
	 * time, e.g. in one request to a server. Without it, `addItemsToLibrary` adds them one at a time
	 * through {@link LibrarySource.addItem}.
	 */
	addItems?(libraryId: TLLibraryId, items: TLNewLibraryItem[]): Promise<TLLibraryItem[]>
	/**
	 * Changes an item's name or meta. A name is never blank, so it can be changed but not removed.
	 * Meta is merged into the item's meta key by key, as `editor.updateShape` merges a shape's.
	 */
	updateItem(itemId: TLLibraryItemId, partial: TLLibraryItemPartial): Promise<void>
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
	 * Gives a library to another owner. Its items stay in it. Resolves with the library at its new
	 * owner once it is listed there: usually the same library, but a source that moves it by copying
	 * gives the copy, with its own id. Optional: sources that don't track owners, or can't move
	 * libraries between them, leave it out.
	 */
	moveLibrary?(libraryId: TLLibraryId, ownerId: string): Promise<TLLibrary>
	/**
	 * Copies a library and its items to an owner, as a new library with the same name, and
	 * returns the copy. Optional: for sources that can copy without the caller loading and adding
	 * every item again, e.g. on a server. Without it, `copyLibrary` loads each item's content through
	 * {@link LibrarySource.getItemContent} and adds the copies together (see `addItemsToLibrary`).
	 */
	copyLibrary?(libraryId: TLLibraryId, ownerId: string): Promise<TLLibrary>

	/**
	 * Who a library created from this document may belong to, in the order to offer them, such as
	 * the user's own workspace and the document's. Optional: without it, any owner the user may
	 * create a library for is offered. Owners stay listed by
	 * {@link LibrarySource.getLibraryOwners} for moving and copying libraries.
	 */
	getNewLibraryOwnerIds?(): string[]
	/**
	 * Why a library is shown in this document, or undefined for one it doesn't show. Optional:
	 * sources that don't distinguish leave it out, and their libraries are shown without a reason.
	 */
	getLibraryPlacement?(libraryId: TLLibraryId): TLLibraryPlacement | undefined
	/**
	 * The libraries the user could add to this document: those they may see that it doesn't show
	 * yet. {@link LibrarySource.getItems} answers for them too, so they can be browsed before being
	 * added. Optional, with {@link LibrarySource.addLibraryToDocument}: sources whose libraries
	 * are all shown leave both out.
	 */
	getAvailableLibraries?(): TLLibrary[]
	/**
	 * Shows an available library in this document, for everyone who opens it, and resolves once it
	 * is listed in {@link LibrarySource.getLibraries}. Adding one already shown does nothing.
	 */
	addLibraryToDocument?(libraryId: TLLibraryId): Promise<void>
	/**
	 * Stops showing a library added to this document. The library and its items stay where they
	 * are kept, available to add again. Only `'added'` libraries can be removed: one housed in the
	 * document is deleted instead, and the user's default is always shown.
	 */
	removeLibraryFromDocument?(libraryId: TLLibraryId): Promise<void>
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
