import { Migrations } from '@tldraw/store'
import { TLShapeUtilConstructor } from '../editor/shapeutils/ShapeUtil'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'
import { TLUnknownShape } from '../schema/records/TLShape'

/** @public */
export type TLShapeInfo<T extends TLUnknownShape = TLUnknownShape> = {
	type: string
	util: TLShapeUtilConstructor<T>
	tool?: TLStateNodeConstructor
	migrations?: Migrations
	validator?: { validate: (shape: T) => T }
}

/** @public */
export function defineShape<T extends TLUnknownShape>(opts: TLShapeInfo<T>): TLShapeInfo<T> {
	return opts
}
