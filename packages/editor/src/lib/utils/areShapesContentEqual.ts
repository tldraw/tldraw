import { TLShape } from '@tldraw/tlschema'

/**
 * Checks if two shapes are equal by comparing their props and meta.
 * @param a - The first shape.
 * @param b - The second shape.
 * @returns True if the shapes are equal, false otherwise.
 */
export function areShapesContentEqual(a: TLShape, b: TLShape) {
	return a.props === b.props && a.meta === b.meta
}
