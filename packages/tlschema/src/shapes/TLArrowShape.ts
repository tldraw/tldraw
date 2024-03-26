import { T } from '@tldraw/validate'
import { vecModelValidator } from '../misc/geometry-types'
import { RETIRED_DOWN_MIGRATION, createShapePropsMigrations } from '../records/TLShape'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle, DefaultLabelColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { ShapePropsType, TLBaseShape, shapeIdValidator } from './TLBaseShape'

const arrowheadTypes = [
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

export const arrowShapeVersions = {
	AddLabelColor: 1,
	AddIsPrecise: 2,
	AddLabelPosition: 3,
} as const

/** @internal */
export const arrowShapeMigrations = createShapePropsMigrations({
	sequence: [
		{
			version: arrowShapeVersions.AddLabelColor,
			up: (props) => {
				props.labelColor = 'black'
			},
			down: RETIRED_DOWN_MIGRATION,
		},

		{
			version: arrowShapeVersions.AddIsPrecise,
			up: ({ start, end }) => {
				if (start.type === 'binding') {
					start.isPrecise = !(start.normalizedAnchor.x === 0.5 && start.normalizedAnchor.y === 0.5)
				}
				if (end.type === 'binding') {
					end.isPrecise = !(end.normalizedAnchor.x === 0.5 && end.normalizedAnchor.y === 0.5)
				}
			},
			down: ({ start, end }) => {
				if (start.type === 'binding') {
					if (!start.isPrecise) {
						start.normalizedAnchor = { x: 0.5, y: 0.5 }
					}
					delete start.isPrecise
				}
				if (end.type === 'binding') {
					if (!end.isPrecise) {
						end.normalizedAnchor = { x: 0.5, y: 0.5 }
					}
					delete end.isPrecise
				}
			},
		},

		{
			version: arrowShapeVersions.AddLabelPosition,
			up: (props) => {
				props.labelPosition = 0.5
			},
			down: (props) => {
				delete props.labelPosition
			},
		},
	],
})
