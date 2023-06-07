import {
	alignValidator,
	colorValidator,
	createShapeValidator,
	dashValidator,
	fillValidator,
	fontValidator,
	geoValidator,
	sizeValidator,
	verticalAlignValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLGeoShape } from './geoShapeTypes'

/** @internal */
export const geoShapeValidator: T.Validator<TLGeoShape> = createShapeValidator(
	'geo',
	T.object({
		geo: geoValidator,
		labelColor: colorValidator,
		color: colorValidator,
		fill: fillValidator,
		dash: dashValidator,
		size: sizeValidator,
		font: fontValidator,
		align: alignValidator,
		verticalAlign: verticalAlignValidator,
		url: T.string,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		growY: T.positiveNumber,
		text: T.string,
	})
)
