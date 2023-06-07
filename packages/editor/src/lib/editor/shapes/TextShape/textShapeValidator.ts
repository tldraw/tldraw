import {
	alignValidator,
	colorValidator,
	createShapeValidator,
	fontValidator,
	sizeValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLTextShape } from './textShapeTypes'

/** @internal */
export const textShapeValidator: T.Validator<TLTextShape> = createShapeValidator(
	'text',
	T.object({
		color: colorValidator,
		size: sizeValidator,
		font: fontValidator,
		align: alignValidator,
		w: T.nonZeroNumber,
		text: T.string,
		scale: T.nonZeroNumber,
		autoSize: T.boolean,
	})
)
