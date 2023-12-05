import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { vec2dModelValidator } from '../misc/geometry-types'
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
		normalizedAnchor: vec2dModelValidator,
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
}

/** @public */
export type TLArrowShapeProps = ShapePropsType<typeof arrowShapeProps>

/** @public */
export type TLArrowShape = TLBaseShape<'arrow', TLArrowShapeProps>

export const ArrowMigrationVersions = {
	AddLabelColor: 1,
	AddIsPrecise: 2,
} as const

/** @internal */
export const arrowShapeMigrations = defineMigrations({
	currentVersion: ArrowMigrationVersions.AddIsPrecise,
	migrators: {
		[ArrowMigrationVersions.AddLabelColor]: {
			up: (record) => {
				return {
					...record,
					props: {
						...record.props,
						labelColor: 'black',
					},
				}
			},
			down: (record) => {
				const { labelColor: _, ...props } = record.props
				return {
					...record,
					props,
				}
			},
		},
		[ArrowMigrationVersions.AddIsPrecise]: {
			up: (record) => {
				const { start, end } = record.props
				return {
					...record,
					props: {
						...record.props,
						start:
							(start as TLArrowShapeTerminal).type === 'binding'
								? {
										...start,
										isPrecise: !(
											start.normalizedAnchor.x === 0.5 && start.normalizedAnchor.y === 0.5
										),
								  }
								: start,
						end:
							(end as TLArrowShapeTerminal).type === 'binding'
								? {
										...end,
										isPrecise: !(end.normalizedAnchor.x === 0.5 && end.normalizedAnchor.y === 0.5),
								  }
								: end,
					},
				}
			},
			down: (record: any) => {
				const { start, end } = record.props
				const nStart = { ...start }
				const nEnd = { ...end }
				if (nStart.type === 'binding') {
					if (!nStart.isPrecise) {
						nStart.normalizedAnchor = { x: 0.5, y: 0.5 }
					}
					delete nStart.isPrecise
				}
				if (nEnd.type === 'binding') {
					if (!nEnd.isPrecise) {
						nEnd.normalizedAnchor = { x: 0.5, y: 0.5 }
					}
					delete nEnd.isPrecise
				}
				return {
					...record,
					props: {
						...record.props,
						start: nStart,
						end: nEnd,
					},
				}
			},
		},
	},
})
