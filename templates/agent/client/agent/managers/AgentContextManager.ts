import { Atom, atom, Box, exhaustiveSwitchError, structuredClone, Vec } from 'tldraw'
import { ContextItem, ShapesContextItem } from '../../../shared/types/ContextItem'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Context items the user has picked to send along with the next request.
 */
export class AgentContextManager extends BaseAgentManager {
	private $contextItems: Atom<ContextItem[]>

	constructor(agent: TldrawAgent) {
		super(agent)
		this.$contextItems = atom('contextItems', [])
	}

	reset(): void {
		this.$contextItems.set([])
	}

	getItems() {
		return this.$contextItems.get()
	}

	setItems(items: ContextItem[]) {
		this.$contextItems.set(items)
	}

	/**
	 * Add a context item, skipping anything already in context.
	 */
	add(item: ContextItem) {
		this.$contextItems.update((items) => {
			if (item.type === 'shapes') {
				return [...items, ...dedupeShapesContextItem(item, items)]
			}
			if (this.has(item)) return items
			return [...items, structuredClone(item)]
		})
	}

	remove(item: ContextItem) {
		this.$contextItems.update((items) => items.filter((v) => item !== v))
	}

	clear() {
		this.$contextItems.set([])
	}

	/**
	 * Whether the item is in context, either on its own or (for a shape) as
	 * part of a shapes group.
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
 * Drop shapes that are already in context. If only one shape is left, return
 * it as a single shape item instead of a group.
 */
function dedupeShapesContextItem(
	item: ShapesContextItem,
	existingItems: ContextItem[]
): ContextItem[] {
	const existingShapeIds = new Set<string>()
	for (const contextItem of existingItems) {
		if (contextItem.type === 'shape') {
			existingShapeIds.add(contextItem.shape.shapeId)
		} else if (contextItem.type === 'shapes') {
			for (const shape of contextItem.shapes) existingShapeIds.add(shape.shapeId)
		}
	}

	const newShapes = item.shapes.filter((shape) => !existingShapeIds.has(shape.shapeId))
	if (newShapes.length === 0) return []

	const newItem: ContextItem =
		newShapes.length === 1
			? { type: 'shape', shape: newShapes[0], source: item.source }
			: { type: 'shapes', shapes: newShapes, source: item.source }
	return [structuredClone(newItem)]
}
