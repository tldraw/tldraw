import { defineMigrations } from '@tldraw/store'

import { nonZeroNumber, object, string, TypeValidator } from '@tldraw/validate'
import { opacityValidator, TLOpacityType } from '../styles/TLOpacityStyle'
import { createShapeValidator, TLBaseShape } from './TLBaseShape'

type TLFrameShapeProps = {
	opacity: TLOpacityType
	w: number
	h: number
	name: string
}

/** @public */
export type TLFrameShape = TLBaseShape<'frame', TLFrameShapeProps>

/** @internal */
export const frameShapeValidator: TypeValidator<TLFrameShape> = createShapeValidator(
	'frame',
	object({
		opacity: opacityValidator,
		w: nonZeroNumber,
		h: nonZeroNumber,
		name: string,
	})
)

/** @internal */
export const frameShapeMigrations = defineMigrations({})
