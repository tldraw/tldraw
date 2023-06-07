import { createShapeValidator } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLFrameShape } from './frameShapeTypes'

/** @internal */
export const frameShapeValidator: T.Validator<TLFrameShape> = createShapeValidator(
	'frame',
	T.object({
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		name: T.string,
	})
)
