import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { ShapeProps, TLBaseShape } from './TLBaseShape'

type TLFrameShapeProps = {
	w: number
	h: number
	name: string
}

/** @public */
export type TLFrameShape = TLBaseShape<'frame', TLFrameShapeProps>

/** @internal */
export const frameShapeProps: ShapeProps<TLFrameShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	name: T.string,
}

/** @internal */
export const frameShapeMigrations = defineMigrations({})
