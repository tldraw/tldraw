import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { opacityValidator, TLOpacityType } from '../styles/TLOpacityStyle'
import { createShapeValidator, TLBaseShape } from './TLBaseShape'

/** @public */
export type TLGroupShapeProps = {
	opacity: TLOpacityType
}

/** @internal */
export const groupShapePropsValidators = {
	opacity: opacityValidator,
}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @internal */
export const groupShapeValidator: T.Validator<TLGroupShape> = createShapeValidator(
	'group',
	T.object(groupShapePropsValidators)
)

/** @internal */
export const groupShapeMigrations = defineMigrations({})
