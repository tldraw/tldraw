import { TLGroupShape, createShapeValidator } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

/** @internal */
export const groupShapeValidator: T.Validator<TLGroupShape> = createShapeValidator(
	'group',
	T.object({})
)
