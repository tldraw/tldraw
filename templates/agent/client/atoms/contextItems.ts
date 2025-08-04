import { atom, Box, structuredClone, TLShape, Vec } from 'tldraw'
import { ContextItem, ShapesContextItem } from '../types/ContextItem'

export const $contextItems = atom<ContextItem[]>('context items', [])
export const $pendingContextItems = atom<ContextItem[]>('pending context items', [])

function processShapesGroup(item: ShapesContextItem, existingItems: ContextItem[]): ContextItem[] {
	// Get all shape IDs that are already in the context
	const existingShapeIds = new Set<string>()

	// Check individual shapes
	existingItems.forEach((contextItem) => {
		if (contextItem.type === 'shape') {
			existingShapeIds.add(contextItem.shape.id)
		} else if (contextItem.type === 'shapes') {
			contextItem.shapes.forEach((shape: TLShape) => {
				existingShapeIds.add(shape.id)
			})
		}
	})

	// Filter out shapes that are already in the context
	const newShapes = item.shapes.filter((shape) => !existingShapeIds.has(shape.id))

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

export function addToContext(item: ContextItem) {
	$contextItems.update((items) => {
		if (item.type === 'shapes') {
			const newItems = processShapesGroup(item, items)
			return [...items, ...newItems]
		}

		const existingItem = items.find((v) => areContextItemsEquivalentOrAlreadyInContext(v, item))
		if (existingItem) return items
		return [...items, structuredClone(item)]
	})
}

export function removeFromContext(item: ContextItem) {
	$contextItems.update((items) =>
		items.filter((v) => !areContextItemsEquivalentOrAlreadyInContext(v, item))
	)
}

function areContextItemsEquivalentOrAlreadyInContext(a: ContextItem, b: ContextItem) {
	if (a.type === b.type) {
		if (a.type === 'shape') {
			return a.shape.id === (b as any).shape.id
		}
		if (a.type === 'area') {
			return Box.Equals(a.bounds, (b as any).bounds)
		}
		if (a.type === 'point') {
			return Vec.Equals(a.point, (b as any).point)
		}
		if (a.type === 'shapes') {
			const aShapes = a.shapes
			const bShapes = (b as any).shapes
			return (
				aShapes.length === bShapes.length &&
				aShapes.every((shape) => bShapes.some((s: any) => s.id === shape.id))
			)
		}
	}

	if (a.type === 'shape' && b.type === 'shapes') {
		return b.shapes.some((s) => s.id === a.shape.id)
	}
	if (a.type === 'shapes' && b.type === 'shape') {
		return a.shapes.some((s) => s.id === b.shape.id)
	}

	throw new Error('Unknown context item type')
}
