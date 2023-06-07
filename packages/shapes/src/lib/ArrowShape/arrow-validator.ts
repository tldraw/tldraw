import {
	TLArrowShape,
	TLArrowTerminal,
	TL_ARROWHEAD_TYPES,
	colorValidator,
	createShapeValidator,
	dashValidator,
	fillValidator,
	fontValidator,
	shapeIdValidator,
	sizeValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

/** @internal */
export const arrowTerminalValidator: T.Validator<TLArrowTerminal> = T.union('type', {
	binding: T.object({
		type: T.literal('binding'),
		boundShapeId: shapeIdValidator,
		normalizedAnchor: T.point,
		isExact: T.boolean,
	}),
	point: T.object({
		type: T.literal('point'),
		x: T.number,
		y: T.number,
	}),
})

/** @internal */
export const arrowheadValidator = T.setEnum(TL_ARROWHEAD_TYPES)

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
