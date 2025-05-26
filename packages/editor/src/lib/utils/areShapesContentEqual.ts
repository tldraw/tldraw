import { TLShape } from '@tldraw/tlschema'

/** @public */
export const areShapesContentEqual = (a: TLShape, b: TLShape) =>
	a.props === b.props && a.meta === b.meta
