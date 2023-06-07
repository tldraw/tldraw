import {
	TLHighlightShape,
	colorValidator,
	createShapeValidator,
	sizeValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { drawShapeSegmentValidator } from '../DrawShape/drawShapeValidator'

/** @internal */
export const highlightShapeValidator: T.Validator<TLHighlightShape> = createShapeValidator(
	'highlight',
	T.object({
		color: colorValidator,
		size: sizeValidator,
		segments: T.arrayOf(drawShapeSegmentValidator),
		isComplete: T.boolean,
		isPen: T.boolean,
	})
)
