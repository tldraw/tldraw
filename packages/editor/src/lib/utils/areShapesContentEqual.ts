import { TLShape } from '@tldraw/tlschema'

/**
 * Checks if two shapes are equal by comparing their props and meta.
 */
export function areShapesContentEqual(a: TLShape, b: TLShape) {
	return a.props === b.props && a.meta === b.meta
}
