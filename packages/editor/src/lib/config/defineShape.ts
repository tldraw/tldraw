import { Migrations } from '@tldraw/store'
import { ShapeProps, TLBaseShape, TLUnknownShape } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { TLShapeUtilConstructor } from '../editor/shapes/ShapeUtil'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'

/** @public */
export type TLShapeInfo<T extends TLUnknownShape = TLUnknownShape> = {
	type: T['type']
	util: TLShapeUtilConstructor<T>
	props?: ShapeProps<T>
	migrations?: Migrations
	tool?: TLStateNodeConstructor
}

export type AnyTLShapeInfo = TLShapeInfo<TLBaseShape<any, any>>

/** @public */
export function defineShape<T extends TLUnknownShape>(
	type: T['type'],
	opts: Omit<TLShapeInfo<T>, 'type'>
): TLShapeInfo<T> {
	assert(
		type === opts.util.type,
		`Shape type "${type}" does not match util type "${opts.util.type}"`
	)
	return { type, ...opts }
}
