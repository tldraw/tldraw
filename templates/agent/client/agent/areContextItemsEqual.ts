import { Box, Vec, exhaustiveSwitchError } from 'tldraw'
import {
	IAreaContextItem,
	IContextItem,
	IPointContextItem,
	IShapeContextItem,
	IShapesContextItem,
} from '../../shared/types/ContextItem'

/**
 * Check if two context items are equal.
 * @param a The first context item.
 * @param b The second context item.
 */
export function areContextItemsEqual(a: IContextItem, b: IContextItem): boolean {
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
