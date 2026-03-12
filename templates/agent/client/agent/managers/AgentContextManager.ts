import { Atom, atom, Box, structuredClone, Vec } from 'tldraw'
import { FocusedShape } from '../../../shared/format/FocusedShape'
import {
	AreaContextItem,
	ContextItem,
	PointContextItem,
	ShapeContextItem,
	ShapesContextItem,
} from '../../../shared/types/ContextItem'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Manages context items for an agent.
 * Context items are pieces of information that can be sent to the model
 * to provide additional context for the conversation.
 */
export class AgentContextManager extends BaseAgentManager {
	/**
	 * An atom containing currently selected context items.
	 *
	 * To send context items to the model, include them in the `contextItems`
	 * field of a request.
	 */
	private $contextItems: Atom<ContextItem[]>

	/**
	 * Creates a new context manager for the given agent.
	 * Initializes with an empty context items array.
	 */
	constructor(agent: TldrawAgent) {
		super(agent)
		this.$contextItems = atom('contextItems', [])
	}

	/**
	 * Reset the context manager to its initial state.
	 * Clears all context items.
	 */
	reset(): void {
		this.$contextItems.set([])
	}

	/**
	 * Get the current context items.
	 * @returns An array of context items.
	 */
	getItems() {
		return this.$contextItems.get()
	}

	/**
	 * Set the context items directly.
	 * Primarily used for loading persisted state.
	 * @param items - The context items to set.
	 */
	setItems(items: ContextItem[]) {
		this.$contextItems.set(items)
	}

	/**
	 * Add a context item to the agent's context, ensuring that duplicates are
	 * not included.
	 *
	 * @param item The context item to add.
	 */
	add(item: ContextItem) {
		this.$contextItems.update((items) => {
			// Don't add shapes that are already within context
			if (item.type === 'shapes') {
				const newItems = dedupeShapesContextItem(item, items)
				return [...items, ...newItems]
			}

			// Don't add items that are already in context
			if (this.has(item)) {
				return items
			}

			return [...items, structuredClone(item)]
		})
	}

	/**
	 * Remove a context item from the agent's context.
	 * @param item The context item to remove.
	 */
	remove(item: ContextItem) {
		this.$contextItems.update((items) => items.filter((v) => item !== v))
	}

	/**
	 * Clear all context items.
	 */
	clear() {
		this.$contextItems.set([])
	}

	/**
	 * Check if the agent's context contains a specific context item. This could
	 * mean as an individual item, or as part of a group of items.
	 *
	 * @param item The context item to check for.
	 * @returns True if the agent's context contains the item, false otherwise.
	 */
	has(item: ContextItem) {
		const items = this.$contextItems.get()
		if (items.some((v) => areContextItemsEqual(v, item))) {
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
}

/**
 * Check if two context items are equal.
 *
 * This is a helper function that is used internally by the manager.
 */
function areContextItemsEqual(a: ContextItem, b: ContextItem): boolean {
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

/**
 * Remove duplicate shapes from a shapes context item.
 * If there's only one shape left, return it as a shape item instead.
 *
 * This is a helper function that is used internally by the manager.
 */
function dedupeShapesContextItem(
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
			contextItem.shapes.forEach((shape: FocusedShape) => {
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

/**
 * Throw an error if a switch case is not exhaustive.
 *
 * This is a helper function that is used internally by the manager.
 */
function exhaustiveSwitchError(value: never, property?: string): never {
	const debugValue =
		property && value && typeof value === 'object' && property in value ? value[property] : value
	throw new Error(`Unknown switch case ${debugValue}`)
}
