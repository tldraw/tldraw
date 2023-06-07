import {
	arrowTerminalValidator,
	arrowheadValidator,
	colorValidator,
	createShapeValidator,
	dashValidator,
	fillValidator,
	fontValidator,
	sizeValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLArrowShape } from './arrowShapeTypes'

/** @internal */
export const arrowShapeValidator: T.Validator<TLArrowShape> = createShapeValidator(
	'arrow',
	T.object({
		labelColor: colorValidator,
		color: colorValidator,
		fill: fillValidator,
		dash: dashValidator,
		size: sizeValidator,
		arrowheadStart: arrowheadValidator,
		arrowheadEnd: arrowheadValidator,
		font: fontValidator,
		start: arrowTerminalValidator,
		end: arrowTerminalValidator,
		bend: T.number,
		text: T.string,
	})
)
