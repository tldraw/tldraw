import { TLShape } from '@tldraw/tlschema'

/** @public */
export const areShapesContentEqual = (a: TLShape, b: TLShape) =>
	a.parentId === b.parentId && a.props === b.props && a.meta === b.meta
