import { TLShape } from '@tldraw/tlschema'

export const areShapesContentEqual = (a: TLShape, b: TLShape) =>
	a.props === b.props && a.meta === b.meta
