import { assetIdValidator, createShapeValidator } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLBookmarkShape } from './bookmarkShapeTypes'

/** @internal */
export const bookmarkShapeValidator: T.Validator<TLBookmarkShape> = createShapeValidator(
	'bookmark',
	T.object({
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		assetId: assetIdValidator.nullable(),
		url: T.string,
	})
)
