import { TLShape } from '@tldraw/tlschema'

/**
 * Compare the content of two shapes to determine if they are equal.
 *
 * @param a - The first shape to compare.
 * @param b - The second shape to compare.
 *
 * @returns `true` if the shapes have the same properties and metadata, `false` otherwise.
 *
 * @public */
export const areShapesContentEqual = (a: TLShape, b: TLShape) =>
	a.props === b.props && a.meta === b.meta
