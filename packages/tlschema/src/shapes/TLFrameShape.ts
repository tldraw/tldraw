import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { opacityValidator, TLOpacityType } from '../styles/TLOpacityStyle'
import { createShapeValidator, TLBaseShape } from './TLBaseShape'

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
