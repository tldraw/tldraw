import { createShapeValidator } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import {
	TLEmbedShape,
	TLEmbedShapePermissions,
	embedShapePermissionDefaults,
} from './embedShapeTypes'

/** @internal */
export const embedShapeValidator: T.Validator<TLEmbedShape> = createShapeValidator(
	'embed',
	T.object({
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		url: T.string,
		tmpOldUrl: T.string.optional(),
		doesResize: T.boolean,
		overridePermissions: T.dict(
			T.setEnum(
				new Set(Object.keys(embedShapePermissionDefaults) as (keyof TLEmbedShapePermissions)[])
			),
			T.boolean.optional()
		).optional(),
	})
)
