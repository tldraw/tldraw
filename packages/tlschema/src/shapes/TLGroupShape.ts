import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { opacityValidator, TLOpacityType } from '../styles/opacity'
import { createShapeValidator, TLBaseShape } from './TLBaseShape'

/** @public */
export type TLGroupShapeProps = {
	opacity: TLOpacityType
}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @public */
export const groupShapeTypeValidator: T.Validator<TLGroupShape> = createShapeValidator(
	'group',
	T.object({
		opacity: opacityValidator,
	})
)

/** @public */
export const groupShapeTypeMigrations = defineMigrations({})
