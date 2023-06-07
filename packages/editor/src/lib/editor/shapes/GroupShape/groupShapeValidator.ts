import { createShapeValidator } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLGroupShape } from './groupShapeTypes'

/** @internal */
export const groupShapeValidator: T.Validator<TLGroupShape> = createShapeValidator(
	'group',
	T.object({})
)
