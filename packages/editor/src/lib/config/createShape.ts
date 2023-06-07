import { Migrations } from '@tldraw/store'
import { TLUnknownShape } from '@tldraw/tlschema'
import { TLShapeUtilConstructor } from '../editor/shapeutils/ShapeUtil'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'

/** @public */
export type TLShapeInfo<T extends TLUnknownShape = TLUnknownShape> = {
	util: TLShapeUtilConstructor<T>
	tool?: TLStateNodeConstructor
	migrations?: Migrations
	validator?: { validate: (shape: T) => T }
}

export function createShape<T extends TLUnknownShape>(opts: {
	util: TLShapeUtilConstructor<T>
	tool?: TLStateNodeConstructor
	migrations?: Migrations
	validator?: { validate: (shape: T) => T }
}): TLShapeInfo<T> {
	return opts
}
