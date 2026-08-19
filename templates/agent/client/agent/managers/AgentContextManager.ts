import { Atom, atom, Box, exhaustiveSwitchError, structuredClone, Vec } from 'tldraw'
import { ContextItem, ShapesContextItem } from '../../../shared/types/ContextItem'
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
				return [...items, ...dedupeShapesContextItem(item, items)]
			}

			// Don't add items that are already in context
			if (this.has(item)) return items

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
		if (items.some((v) => areContextItemsEqual(v, item))) return true

		if (item.type === 'shape') {
			return items.some(
				(existing) =>
					existing.type === 'shapes' &&
					existing.shapes.some((shape) => shape.shapeId === item.shape.shapeId)
			)
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
			return a.shape.shapeId === (b as typeof a).shape.shapeId
		}
		case 'shapes': {
			const bShapes = (b as typeof a).shapes
			if (a.shapes.length !== bShapes.length) return false
			return a.shapes.every((shape) => bShapes.some((s) => s.shapeId === shape.shapeId))
		}
		case 'area': {
			return Box.Equals(a.bounds, (b as typeof a).bounds)
		}
		case 'point': {
			return Vec.Equals(a.point, (b as typeof a).point)
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
	for (const contextItem of existingItems) {
		if (contextItem.type === 'shape') {
			existingShapeIds.add(contextItem.shape.shapeId)
		} else if (contextItem.type === 'shapes') {
			for (const shape of contextItem.shapes) existingShapeIds.add(shape.shapeId)
		}
	}

	// Filter out shapes that are already in the context
	const newShapes = item.shapes.filter((shape) => !existingShapeIds.has(shape.shapeId))

	// Only add if there are remaining shapes
	// No new shapes to add
	if (newShapes.length === 0) return []

	// If only one shape remains, add it as a single shape item
	// Otherwise add as a shapes group
	const newItem: ContextItem =
		newShapes.length === 1
			? { type: 'shape', shape: newShapes[0], source: item.source }
			: { type: 'shapes', shapes: newShapes, source: item.source }
	return [structuredClone(newItem)]
}
