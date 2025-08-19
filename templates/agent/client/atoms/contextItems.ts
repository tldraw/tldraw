import { atom, Box, exhaustiveSwitchError, structuredClone, Vec } from 'tldraw'
import { ISimpleShape } from '../../shared/format/SimpleShape'
import {
	AreaContextItem,
	ContextItem,
	PointContextItem,
	ShapeContextItem,
	ShapesContextItem,
} from '../../shared/types/ContextItem'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'

export const $contextItems = atom<ContextItem[]>('context items', [])
export const $pendingContextItems = atom<ContextItem[]>('pending context items', [])

persistAtomInLocalStorage($contextItems, 'context-items')

export function addToContext(item: ContextItem) {
	$contextItems.update((items) => {
		// Don't add shapes that are already within context
		if (item.type === 'shapes') {
			const newItems = stripDuplicateShapesFromContextItem(item, items)
			return [...items, ...newItems]
		}

		// Don't add items that are already in context
		if (contextItemIsAlreadyContainedInContext(item, items)) {
			return items
		}

		return [...items, structuredClone(item)]
	})
}

export function removeFromContext(item: ContextItem) {
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
	item: ShapesContextItem,
	existingItems: ContextItem[]
): ContextItem[] {
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
			const newItem: ContextItem = {
				type: 'shape',
				shape: newShapes[0],
				source: item.source,
			}
			return [structuredClone(newItem)]
		}

		// Otherwise add as a shapes group
		const newItem: ContextItem = {
			type: 'shapes',
			shapes: newShapes,
			source: item.source,
		}
		return [structuredClone(newItem)]
	}

	// No new shapes to add
	return []
}

function contextItemIsAlreadyContainedInContext(
	item: Exclude<ContextItem, { type: 'shapes' }>,
	items: ContextItem[]
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

function areContextItemsEquivalent(a: ContextItem, b: ContextItem): boolean {
	if (a.type !== b.type) return false

	switch (a.type) {
		case 'shape': {
			const _b = b as ShapeContextItem
			return a.shape.shapeId === _b.shape.shapeId
		}
		case 'shapes': {
			const _b = b as ShapesContextItem
			if (a.shapes.length !== _b.shapes.length) return false
			return a.shapes.every((shape) => _b.shapes.find((s) => s.shapeId === shape.shapeId))
		}
		case 'area': {
			const _b = b as AreaContextItem
			return Box.Equals(a.bounds, _b.bounds)
		}
		case 'point': {
			const _b = b as PointContextItem
			return Vec.Equals(a.point, _b.point)
		}
		default: {
			exhaustiveSwitchError(a)
		}
	}
}
