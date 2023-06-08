import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { createShapeValidator, TLBaseShape } from './TLBaseShape'

/** @public */
export type TLGroupShapeProps = { [key in never]: undefined }

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @internal */
export const groupShapeValidator: T.Validator<TLGroupShape> = createShapeValidator(
	'group',
	T.object({})
)

/** @internal */
export const groupShapeMigrations = defineMigrations({})
