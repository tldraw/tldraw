import { Migrations } from '@tldraw/store'
import { TLUnknownShape } from '@tldraw/tlschema'
import { TLShapeUtilConstructor } from '../editor/shapeutils/ShapeUtil'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'

/** @public */
export type TLShapeInfo<T extends TLUnknownShape = TLUnknownShape> = {
	type: string
	util: TLShapeUtilConstructor<T>
	tool?: TLStateNodeConstructor
	migrations?: Migrations
	validator?: { validate: (shape: T) => T }
}

export function createShape<T extends TLUnknownShape>(
	type: T['type'],
	opts: Omit<TLShapeInfo<T>, 'type'>
): TLShapeInfo<T> {
	return { ...opts, type }
}
