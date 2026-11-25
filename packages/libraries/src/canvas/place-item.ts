import type { Editor, TLContent, TLLibraryItemId, TLShape, TLShapeId, VecLike } from 'tldraw'
import { LibraryNotFoundError, type LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'

/** @public */
export interface TLPlaceLibraryItemOptions {
	/** The page point to centre the item on. Defaults to the middle of the viewport. */
	point?: VecLike
	/** Whether to select the placed shapes. Defaults to true. */
	select?: boolean
}

/**
 * What a {@link LibraryItemPlacer} is asked to place.
 * @public
 */
export interface TLLibraryItemPlacement {
	item: TLLibraryItem
	/** The item's shapes, loaded from the source and migrated to the editor's schema. */
	content: TLContent
	/** The page point to centre the item on. Left out, the placer decides, e.g. the viewport's middle. */
	point?: VecLike
	/**
	 * Whether to select the placed shapes. Always true for a drag: the placed shapes are selected
	 * again after the placer returns, so that they follow the pointer until it is released.
	 */
	select: boolean
	/** Whether the item was clicked or dragged out. */
	via: 'click' | 'drag'
}

/**
 * Puts an item's shapes on the current page and returns the ids of the root shapes it placed,
 * those not inside another placed shape. Replace the {@link LibrariesPanel}'s with its `placeItem`
 * prop, or {@link useLibraryItemDrag}'s with its `placeItem` option, e.g. to place an item without
 * selecting it, or behind other shapes. Call {@link defaultPlaceLibraryItem} for the usual placing
 * and change the shapes it returns, or change `content` first.
 *
 * The undo stopping point is made before the placer is called. A drag hands the placed shapes to
 * the select tool's translating state, which moves them until the pointer is released; anything
 * that should happen once they're dropped, such as snapping to a grid, belongs in their shape
 * util's `onTranslateEnd`.
 *
 * @example
 * ```ts
 * const placeMapsBehind: LibraryItemPlacer = (editor, placement) => {
 * 	const ids = defaultPlaceLibraryItem(editor, placement)
 * 	if (placement.item.meta.kind === 'map') editor.sendToBack(ids)
 * 	return ids
 * }
 * ```
 * @public
 */
export type LibraryItemPlacer = (editor: Editor, placement: TLLibraryItemPlacement) => TLShapeId[]

/**
 * Places an item's content as pasting does, centred on `point` or the middle of the viewport and
 * inside the deepest shape there that accepts it, such as a frame. Returns the placed root shapes'
 * ids.
 * @public
 */
export function defaultPlaceLibraryItem(
	editor: Editor,
	{ content, point, select }: TLLibraryItemPlacement
): TLShapeId[] {
	const { added } = editor.store.extractingChanges(() => {
		editor.putContentOntoCurrentPage(content, {
			point: point ?? editor.getViewportPageBounds().center,
			select,
		})
	})
	const shapes = Object.values(added).filter(
		(record): record is TLShape => record.typeName === 'shape'
	)
	const placedIds = new Set<string>(shapes.map((shape) => shape.id))
	return shapes.filter((shape) => !placedIds.has(shape.parentId)).map((shape) => shape.id)
}

/** The listed item with this id, or undefined for one the source doesn't list. */
export function findListedItem(source: LibrarySource, itemId: TLLibraryItemId) {
	for (const library of source.getLibraries()) {
		const item = source.getItems(library.id).find((i) => i.id === itemId)
		if (item) return item
	}
	return undefined
}

/** Loads an item and places it with `placeItem`, after an undo stopping point. */
export async function placeItemWith(
	editor: Editor,
	source: LibrarySource,
	itemId: TLLibraryItemId,
	{ point, select = true }: TLPlaceLibraryItemOptions,
	placeItem: LibraryItemPlacer,
	via: TLLibraryItemPlacement['via']
) {
	const item = findListedItem(source, itemId)
	if (!item) throw new LibraryNotFoundError(itemId)
	const { content } = await source.getItemContent(itemId)
	editor.markHistoryStoppingPoint('place library item')
	return placeItem(editor, { item, content, point, select, via })
}

/**
 * Places a copy of an item the same way pasting does: centred on `point`, or the middle of the
 * viewport, and selected unless `select` is false. Resolves with the ids of the root shapes
 * placed. Rejects with the source's error when the item can't be loaded, or a
 * {@link LibraryNotFoundError} when the source doesn't list it.
 * @public
 */
export async function placeLibraryItem(
	editor: Editor,
	source: LibrarySource,
	itemId: TLLibraryItemId,
	options: TLPlaceLibraryItemOptions = {}
): Promise<TLShapeId[]> {
	return placeItemWith(editor, source, itemId, options, defaultPlaceLibraryItem, 'click')
}
