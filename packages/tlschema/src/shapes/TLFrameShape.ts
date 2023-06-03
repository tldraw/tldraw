import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/validate'
import { TLOpacityType } from '../style-types'
import { opacityValidator } from '../validation'
import { createShapeValidator, TLBaseShape } from './shape-validation'

/** @public */
export type TLFrameShapeProps = {
	opacity: TLOpacityType
	w: number
	h: number
	name: string
}

/** @public */
export type TLFrameShape = TLBaseShape<'frame', TLFrameShapeProps>

/** @public */
export const frameShapeTypeValidator: T.Validator<TLFrameShape> = createShapeValidator(
	'frame',
	T.object({
		opacity: opacityValidator,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		name: T.string,
	})
)

/** @public */
export const frameShapeTypeMigrations = defineMigrations({})
