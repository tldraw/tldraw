import { assetIdValidator, createShapeValidator } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLImageShape } from './imageShapeTypes'

/** @internal */
export const cropValidator = T.object({
	topLeft: T.point,
	bottomRight: T.point,
})

/** @internal */
export const imageShapeValidator: T.Validator<TLImageShape> = createShapeValidator(
	'image',
	T.object({
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		playing: T.boolean,
		url: T.string,
		assetId: assetIdValidator.nullable(),
		crop: cropValidator.nullable(),
	})
)
