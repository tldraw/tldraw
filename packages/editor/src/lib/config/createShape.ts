import { Migrations } from '@tldraw/store'
import { TLUnknownShape } from '@tldraw/tlschema'
import { TLShapeUtilConstructor } from '../editor/shapeutils/ShapeUtil'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'

export type EditorShape<T extends TLUnknownShape> = {
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
}) {
	return opts
}
