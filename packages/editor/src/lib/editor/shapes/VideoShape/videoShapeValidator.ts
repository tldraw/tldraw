import { assetIdValidator, createShapeValidator } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLVideoShape } from './videoShapeTypes'

/** @internal */
export const videoShapeValidator: T.Validator<TLVideoShape> = createShapeValidator(
	'video',
	T.object({
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		time: T.number,
		playing: T.boolean,
		url: T.string,
		assetId: assetIdValidator.nullable(),
	})
)
