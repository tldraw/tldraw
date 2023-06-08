import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { createShapeValidator, TLBaseShape } from './TLBaseShape'

type TLFrameShapeProps = {
	w: number
	h: number
	name: string
}

/** @public */
export type TLFrameShape = TLBaseShape<'frame', TLFrameShapeProps>

/** @internal */
export const frameShapeValidator: T.Validator<TLFrameShape> = createShapeValidator(
	'frame',
	T.object({
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		name: T.string,
	})
)

/** @internal */
export const frameShapeMigrations = defineMigrations({})
