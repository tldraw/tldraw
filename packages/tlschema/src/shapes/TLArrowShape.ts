import { T } from '@tldraw/validate'
import { vecModelValidator } from '../misc/geometry-types'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle, DefaultLabelColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { ShapePropsType, TLBaseShape, shapeIdValidator } from './TLBaseShape'

const arrowheadTypes = [
	// 💡❗ If you remove a value from this enum, make sure you also add a migration.
	// 💡❗ (see the tlschema README.md for instructions)
	'arrow',
	'triangle',
	'square',
	'dot',
	'pipe',
	'diamond',
	'inverted',
	'bar',
	'none',
] as const

/** @public */
export const ArrowShapeArrowheadStartStyle = StyleProp.defineEnum('tldraw:arrowheadStart', {
	defaultValue: 'none',
	values: arrowheadTypes,
})

/** @public */
export const ArrowShapeArrowheadEndStyle = StyleProp.defineEnum('tldraw:arrowheadEnd', {
	defaultValue: 'arrow',
	values: arrowheadTypes,
})

/** @public */
export type TLArrowShapeArrowheadStyle = T.TypeOf<typeof ArrowShapeArrowheadStartStyle>

/** @public */
const ArrowShapeTerminal = T.union('type', {
	// 💡❗ If you make any changes to this type, make sure you also add a migration if required.
	// 💡❗ (see the tlschema README.md for instructions)
	binding: T.object({
		type: T.literal('binding'),
		boundShapeId: shapeIdValidator,
		normalizedAnchor: vecModelValidator,
		isExact: T.boolean,
		isPrecise: T.boolean,
	}),
	point: T.object({
		type: T.literal('point'),
		x: T.number,
		y: T.number,
	}),
})

/** @public */
export type TLArrowShapeTerminal = T.TypeOf<typeof ArrowShapeTerminal>

/** @public */
export const arrowShapeProps = {
	// 💡❗ If you make any changes to this type, make sure you also add a migration if required.
	// 💡❗ (see the tlschema README.md for instructions)
	labelColor: DefaultLabelColorStyle,
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	arrowheadStart: ArrowShapeArrowheadStartStyle,
	arrowheadEnd: ArrowShapeArrowheadEndStyle,
	font: DefaultFontStyle,
	start: ArrowShapeTerminal,
	end: ArrowShapeTerminal,
	bend: T.number,
	text: T.string,
	labelPosition: T.number,
}

/** @public */
export type TLArrowShapeProps = ShapePropsType<typeof arrowShapeProps>

/** @public */
export type TLArrowShape = TLBaseShape<'arrow', TLArrowShapeProps>
