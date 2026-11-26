import type { TLLibrary, TLLibraryId, TLLibraryItemId, TLLibraryThumbnail } from '@tldraw/tlschema'
import type { JsonObject } from '@tldraw/utils'
import type { TLUiIconJsx, TLUiIconType } from 'tldraw'
import type { TLLibraryItem, TLLibraryItemContent } from './schema'

/**
 * A change a user can try to make. Sources answer {@link LibrarySource.can}.
 *
 * Using items has no action: anything a source lists can be used. A library someone may not
 * use is simply not listed to them.
 * @public
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
 * `{ ownerId }`, e.g. whether a library may be created for that owner. A library inside another has
 * no permissions of its own: it has those of the library at the top of its tree. With a library id,
 * `'createLibrary'` asks whether a library may be created, or moved, inside it.
 * @public
 */
export type TLLibraryTarget = TLLibraryId | { ownerId: string }

/**
 * Why a library is shown in the document, answered by {@link LibrarySource.getLibraryPlacement}:
 *
 * - `'housed'`: it is kept in the document itself, and goes wherever the document goes.
 * - `'added'`: it is kept elsewhere, such as in a workspace, and was added to the document.
 * - `'default'`: it is the user's own default library, shown in every document they open. It
 *   can't be renamed or deleted.
 * - `'document'`: it is the document's own library, kept in it, which the panel shows first under
 *   "This file", before the libraries housed in or added to the document.
 * @public
 */
export type TLLibraryPlacement = 'housed' | 'added' | 'default' | 'document'

/**
 * Something a library can belong to, such as a user or a workspace.
 * @public
 */
export interface TLLibraryOwner {
	id: string
	name: string
	/** Shown before the owner's name in the libraries panel's menus. */
	icon?: TLUiIconType | Exclude<string, TLUiIconType> | TLUiIconJsx
}

/**
 * Choices for a new library.
 * @public
 */
export interface TLNewLibraryOptions {
	/**
	 * Who it belongs to. Left out, the source decides, e.g. its default owner, or, inside a library,
	 * that library's owner.
	 */
	ownerId?: string
	/**
	 * The library it goes inside. It then belongs to that library's owner, so `ownerId`, if given,
	 * must be the same. Left out, it goes at the top level.
	 */
	parentId?: TLLibraryId
	/** Stored on the library as its `meta`, e.g. the pack it was copied from. */
	meta?: JsonObject
}

/**
 * Where {@link LibrarySource.copyLibrary} puts the copy, and how it names it.
 * @public
 */
export interface TLCopyLibraryOptions {
	/**
	 * The library to put the copy inside, which must belong to the owner the copy goes to. Left out,
	 * the copy goes at the top level.
	 */
	parentId?: TLLibraryId
	/**
	 * The copy's name, from the library's, e.g. "Shapes (Copy)" from "Shapes". Left out, the copy
	 * has the library's name. A source that limits names' length may shorten the name it passes, so
	 * that the result fits.
	 */
	getName?(name: string): string
}

/**
 * What a source needs to store a new item.
 * @public
 */
export interface TLNewLibraryItem {
	/** Optional: adding from the canvas shouldn't force people to name things first. */
	name?: string
	content: TLLibraryItemContent
	/**
	 * A rendered preview, or a light and a dark one for an app with both modes. Leave it out and the
	 * UI renders one from the item's content when the item is shown, with its name in the meantime.
	 */
	thumbnail?: TLLibraryThumbnail<Blob>
	/** Stored on the item as its `meta`, e.g. the category it had in the pack it was copied from. */
	meta?: JsonObject
}

/**
 * The changes {@link LibrarySource.updateItem} makes to an item. Fields left out stay as they are.
 * @public
 */
export type TLLibraryItemPartial = Partial<Pick<TLLibraryItem, 'name' | 'meta'>>

/**
 * What a source knows about an item beyond its listing, shown in its details. Every field is
 * optional: the details leave out what a source doesn't know.
 * @public
 */
export interface TLLibraryItemDetails {
	/** The name to show for whoever saved the item. */
	creatorName?: string
	description?: string
}

/**
 * What a tile needs from a thumbnail, passed to {@link LibrarySource.resolveThumbnail}. The panel
 * builds it each time it asks.
 * @public
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
 * @public
 */
export interface LibrarySource {
	readonly id: string

	/**
	 * The libraries shown in this document. For a source where libraries are added to a document,
	 * these are the ones housed in it, added to it and the user's default (see
	 * {@link LibrarySource.getLibraryPlacement}); the rest the user may add are
	 * {@link LibrarySource.getAvailableLibraries}.
	 *
	 * Listed flat, a library inside another naming it as its `parentId` (see `getLibraryTree`).
	 * A library is listed with everything inside it, and never without the library it is in.
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
	 * Fetches a library's items, for a source that lists them only once they are fetched, e.g. from
	 * a download per library. The panel calls it for each library whose items it is about to show:
	 * an unfolded section once it comes near the panel's scrolled view, and every library while a
	 * search is active. Only that library's items: the libraries inside it load their own when the
	 * panel asks. Called again on each of those, so return straight away once the items are fetched
	 * or being fetched. Failures are the source's to report. Optional: a source that lists its items
	 * straight away leaves it out.
	 */
	loadItems?(libraryId: TLLibraryId): void
	/**
	 * Whether a library has items that aren't listed yet: not yet fetched by
	 * {@link LibrarySource.loadItems}, or being fetched. Reactive, like the other getters. While it
	 * has, the panel shows nothing in place of the library's items rather than calling it empty,
	 * and a search that has found nothing yet says it's still searching rather than that nothing
	 * matched.
	 */
	isLoadingItems?(libraryId: TLLibraryId): boolean
	/**
	 * How many items a library has, whether or not they're listed yet, for a source that can tell
	 * without fetching them. Reactive, like the other getters. Optional: without it, the UI counts
	 * {@link LibrarySource.getItems}.
	 */
	getItemCount?(libraryId: TLLibraryId): number
	/**
	 * A library's first `count` items, in its order, to preview it in a list of libraries, for a
	 * source that has them without fetching the rest. Reactive, like the other getters. Optional:
	 * without it, the UI previews the first of {@link LibrarySource.getItems}.
	 */
	getPreviewItems?(libraryId: TLLibraryId, count: number): TLLibraryItem[]
	/**
	 * Whether a library may have items matching a search, answered without its items, e.g. from a
	 * list of their names the source has to hand. The panel searches a library, loading its items
	 * with {@link LibrarySource.loadItems}, only where its name matches or this says it may. `query`
	 * is trimmed and lowercased, and an item matches when its name contains it, ignoring case.
	 * Optional: without it, every library is searched. Reactive, like the other getters.
	 */
	mayHaveItemsMatching?(libraryId: TLLibraryId, query: string): boolean

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
	/** Deletes a library with everything inside it: its items, and the libraries in it and theirs. */
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
	 * Moves an item to another library, keeping its content and thumbnail, and resolves to its id
	 * there: the same id, unless the source moves it by copying it, as a `CompositeLibrarySource`
	 * does between its sources. Needs `deleteItem` on the library it leaves and `addItem` on
	 * the one it joins. Optional: the UI offers "Move to" only for sources that have it.
	 */
	moveItem?(itemId: TLLibraryItemId, toLibraryId: TLLibraryId): Promise<TLLibraryItemId>

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
	 * Copies a library, with its items and the libraries inside it and theirs, to the top level of
	 * `ownerId` or inside `options.parentId`, which must then belong to `ownerId`, as a new library
	 * named by `options.getName`, and returns the copy. The items, and the libraries inside it, keep
	 * their names. Left out, `ownerId` is the parent's owner, or the source's default: a source
	 * without owners leaves it out. Optional: for sources that can copy without the caller loading
	 * and adding every item again, e.g. on a server. Without it, `copyLibrary` loads each item's
	 * content through
	 * {@link LibrarySource.getItemContent} and adds the copies together (see `addItemsToLibrary`).
	 */
	copyLibrary?(
		libraryId: TLLibraryId,
		ownerId: string | undefined,
		options?: TLCopyLibraryOptions
	): Promise<TLLibrary>

	/**
	 * Who a library created from this document may belong to, in the order to offer them, such as
	 * the user's own workspace and the document's. Optional: without it, any owner the user may
	 * create a library for is offered. Owners stay listed by
	 * {@link LibrarySource.getLibraryOwners} for moving and copying libraries.
	 */
	getNewLibraryOwnerIds?(): string[]
	/**
	 * Why a library is shown in this document, or undefined for one it doesn't show. A library
	 * inside another is shown for the reason the library at the top of its tree is. Optional:
	 * sources that don't distinguish leave it out, and their libraries are shown without a reason.
	 */
	getLibraryPlacement?(libraryId: TLLibraryId): TLLibraryPlacement | undefined
	/**
	 * The libraries the user could add to this document: those they may see that it doesn't show
	 * yet, listed flat with everything inside them, as {@link LibrarySource.getLibraries} lists
	 * libraries. {@link LibrarySource.getItems} answers for them too, so they can be browsed before
	 * being added. Optional, with {@link LibrarySource.addLibraryToDocument}: sources whose libraries
	 * are all shown leave both out.
	 */
	getAvailableLibraries?(): TLLibrary[]
	/**
	 * Shows an available library in this document, with everything inside it, for everyone who opens
	 * it, and resolves once it is listed in {@link LibrarySource.getLibraries}. Only a library at the
	 * top level is added: the libraries inside it come with it. Adding one already shown does
	 * nothing.
	 */
	addLibraryToDocument?(libraryId: TLLibraryId): Promise<void>
	/**
	 * Stops showing a library added to this document. The library and its items stay where they
	 * are kept, available to add again, with everything inside them. Only `'added'` libraries at the
	 * top level can be removed: one inside another goes with it, one housed in the
	 * document is deleted instead, and the user's default is always shown.
	 */
	removeLibraryFromDocument?(libraryId: TLLibraryId): Promise<void>
}

/**
 * Thrown by a source when the current user isn't allowed to do something.
 * @public
 */
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

/**
 * Thrown by a source when a library, item or owner doesn't exist (any more).
 * @public
 */
export class LibraryNotFoundError extends Error {
	override name = 'LibraryNotFoundError'
	constructor(readonly id: string) {
		super(`No library, item or owner with id ${id}`)
	}
}

/**
 * Thrown by a source when a library can't go where it was asked to: inside a library of another
 * owner than the one named.
 * @public
 */
export class LibraryNestingError extends Error {
	override name = 'LibraryNestingError'
}
