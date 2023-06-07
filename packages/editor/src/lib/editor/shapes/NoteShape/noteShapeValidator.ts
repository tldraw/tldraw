import {
	alignValidator,
	colorValidator,
	createShapeValidator,
	fontValidator,
	sizeValidator,
	verticalAlignValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLNoteShape } from './noteShapeTypes'

/** @internal */
export const noteShapeValidator: T.Validator<TLNoteShape> = createShapeValidator(
	'note',
	T.object({
		color: colorValidator,
		size: sizeValidator,
		font: fontValidator,
		align: alignValidator,
		verticalAlign: verticalAlignValidator,
		growY: T.positiveNumber,
		url: T.string,
		text: T.string,
	})
)
