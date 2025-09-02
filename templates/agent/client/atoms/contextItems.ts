import { atom, Box, exhaustiveSwitchError, structuredClone, Vec } from 'tldraw'
import { ISimpleShape } from '../../shared/format/SimpleShape'
import {
	IAreaContextItem,
	IContextItem,
	IPointContextItem,
	IShapeContextItem,
	IShapesContextItem,
} from '../../shared/types/ContextItem'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'

/**
 * An atom containing the context items that the user has added to the chat input.
 * TODO: Change this to an editor atom.
 */
export const $contextItems = atom<IContextItem[]>('context items', [])
persistAtomInLocalStorage($contextItems, 'context-items')

export function addToContext(item: IContextItem) {
	$contextItems.update((items) => {
		// Don't add shapes that are already within context
		if (item.type === 'shapes') {
			const newItems = stripDuplicateShapesFromContextItem(item, items)
			return [...items, ...newItems]
		}

		// Don't add items that are already in context
		if (isContextItemAlreadyContainedInContext(item, items)) {
			return items
		}

		return [...items, structuredClone(item)]
	})
}

export function removeFromContext(item: IContextItem) {
	$contextItems.update((items) => items.filter((v) => item !== v))
}

/**
 * Remove duplicate shapes from a shapes context item.
 * If there's only one shape left, return it as a shape item instead.
 *
 * @param item - The shapes context item to strip duplicates from.
 * @param existingItems - The existing context items to check against.
 * @returns The new context items with duplicates removed.
 */
function stripDuplicateShapesFromContextItem(
	item: IShapesContextItem,
	existingItems: IContextItem[]
): IContextItem[] {
	// Get all shape IDs that are already in the context
	const existingShapeIds = new Set<string>()

	// Check individual shapes
	existingItems.forEach((contextItem) => {
		if (contextItem.type === 'shape') {
			existingShapeIds.add(contextItem.shape.shapeId)
		} else if (contextItem.type === 'shapes') {
			contextItem.shapes.forEach((shape: ISimpleShape) => {
				existingShapeIds.add(shape.shapeId)
			})
		}
	})

	// Filter out shapes that are already in the context
	const newShapes = item.shapes.filter((shape) => !existingShapeIds.has(shape.shapeId))

	// Only add if there are remaining shapes
	if (newShapes.length > 0) {
		// If only one shape remains, add it as a single shape item
		if (newShapes.length === 1) {
			const newItem: IContextItem = {
				type: 'shape',
				shape: newShapes[0],
				source: item.source,
			}
			return [structuredClone(newItem)]
		}

		// Otherwise add as a shapes group
		const newItem: IContextItem = {
			type: 'shapes',
			shapes: newShapes,
			source: item.source,
		}
		return [structuredClone(newItem)]
	}

	// No new shapes to add
	return []
}

function isContextItemAlreadyContainedInContext(
	item: Exclude<IContextItem, { type: 'shapes' }>,
	items: IContextItem[]
): boolean {
	if (items.some((v) => areContextItemsEquivalent(v, item))) {
		return true
	}

	if (item.type === 'shape') {
		for (const existingItem of items) {
			if (existingItem.type === 'shapes') {
				if (existingItem.shapes.some((shape) => shape.shapeId === item.shape.shapeId)) {
					return true
				}
			}
		}
	}

	return false
}

function areContextItemsEquivalent(a: IContextItem, b: IContextItem): boolean {
	if (a.type !== b.type) return false

	switch (a.type) {
		case 'shape': {
			const _b = b as IShapeContextItem
			return a.shape.shapeId === _b.shape.shapeId
		}
		case 'shapes': {
			const _b = b as IShapesContextItem
			if (a.shapes.length !== _b.shapes.length) return false
			return a.shapes.every((shape) => _b.shapes.find((s) => s.shapeId === shape.shapeId))
		}
		case 'area': {
			const _b = b as IAreaContextItem
			return Box.Equals(a.bounds, _b.bounds)
		}
		case 'point': {
			const _b = b as IPointContextItem
			return Vec.Equals(a.point, _b.point)
		}
		default: {
			exhaustiveSwitchError(a)
		}
	}
}
