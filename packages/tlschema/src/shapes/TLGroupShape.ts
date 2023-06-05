import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { createShapeValidator, TLBaseShape } from './TLBaseShape'

/** @public */
// eslint-disable-next-line @typescript-eslint/ban-types
export type TLGroupShapeProps = {}

/** @internal */
export const groupShapePropsValidators = {}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @internal */
export const groupShapeValidator: T.Validator<TLGroupShape> = createShapeValidator(
	'group',
	T.object(groupShapePropsValidators)
)

/** @internal */
export const groupShapeMigrations = defineMigrations({})
