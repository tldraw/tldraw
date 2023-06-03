import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { opacityValidator, TLOpacityType } from '../styles/TLOpacityStyle'
import { createShapeValidator, TLBaseShape } from './base-shape'

/** @public */
export type TLGroupShapeProps = {
	opacity: TLOpacityType
}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @public */
export const groupShapeValidator: T.Validator<TLGroupShape> = createShapeValidator(
	'group',
	T.object({
		opacity: opacityValidator,
	})
)

/** @public */
export const groupShapeMigrations = defineMigrations({})
