import { defineMigrations } from '@tldraw/store'

import {
	nonZeroNumberValidator,
	objectValidator,
	stringValidator,
	TypeValidator,
} from '@tldraw/validate'
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
	objectValidator({
		opacity: opacityValidator,
		w: nonZeroNumberValidator,
		h: nonZeroNumberValidator,
		name: stringValidator,
	})
)

/** @internal */
export const frameShapeMigrations = defineMigrations({})
