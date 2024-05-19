import { createMigrationSequence } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLArrowBinding } from '../bindings/TLArrowBinding'
import { VecModel, vecModelValidator } from '../misc/geometry-types'
import { createBindingId } from '../records/TLBinding'
import { TLShapeId, createShapePropsMigrationIds } from '../records/TLShape'
import {
	RETIRED_DOWN_MIGRATION,
	RecordPropsType,
	TLPropsMigration,
	createPropsMigration,
} from '../recordsWithProps'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle, DefaultLabelColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

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
export const arrowShapeProps = {
	labelColor: DefaultLabelColorStyle,
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	arrowheadStart: ArrowShapeArrowheadStartStyle,
	arrowheadEnd: ArrowShapeArrowheadEndStyle,
	font: DefaultFontStyle,
	start: vecModelValidator,
	end: vecModelValidator,
	bend: T.number,
	text: T.string,
	labelPosition: T.number,
}

/** @public */
export type TLArrowShapeProps = RecordPropsType<typeof arrowShapeProps>

/** @public */
export type TLArrowShape = TLBaseShape<'arrow', TLArrowShapeProps>

export const arrowShapeVersions = createShapePropsMigrationIds('arrow', {
	AddLabelColor: 1,
	AddIsPrecise: 2,
	AddLabelPosition: 3,
	ExtractBindings: 4,
})

function propsMigration(migration: TLPropsMigration) {
	return createPropsMigration<TLArrowShape>('shape', 'arrow', migration)
}

/** @public */
export const arrowShapeMigrations = createMigrationSequence({
	sequenceId: 'com.tldraw.shape.arrow',
	sequence: [
		propsMigration({
			id: arrowShapeVersions.AddLabelColor,
			up: (props) => {
				props.labelColor = 'black'
			},
			down: RETIRED_DOWN_MIGRATION,
		}),

		propsMigration({
			id: arrowShapeVersions.AddIsPrecise,
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
		}),

		propsMigration({
			id: arrowShapeVersions.AddLabelPosition,
			up: (props) => {
				props.labelPosition = 0.5
			},
			down: (props) => {
				delete props.labelPosition
			},
		}),

		{
			id: arrowShapeVersions.ExtractBindings,
			scope: 'store',
			up: (oldStore) => {
				type OldArrowTerminal =
					| {
							type: 'point'
							x: number
							y: number
					  }
					| {
							type: 'binding'
							boundShapeId: TLShapeId
							normalizedAnchor: VecModel
							isExact: boolean
							isPrecise: boolean
					  }
					// new type:
					| { type?: undefined; x: number; y: number }

				type OldArrow = TLBaseShape<'arrow', { start: OldArrowTerminal; end: OldArrowTerminal }>

				const arrows = Object.values(oldStore).filter(
					(r: any): r is OldArrow => r.typeName === 'shape' && r.type === 'arrow'
				)

				for (const arrow of arrows) {
					const { start, end } = arrow.props
					if (start.type === 'binding') {
						const id = createBindingId()
						const binding: TLArrowBinding = {
							typeName: 'binding',
							id,
							type: 'arrow',
							fromId: arrow.id,
							toId: start.boundShapeId,
							meta: {},
							props: {
								terminal: 'start',
								normalizedAnchor: start.normalizedAnchor,
								isExact: start.isExact,
								isPrecise: start.isPrecise,
							},
						}

						oldStore[id] = binding
						arrow.props.start = { x: 0, y: 0 }
					} else {
						delete arrow.props.start.type
					}
					if (end.type === 'binding') {
						const id = createBindingId()
						const binding: TLArrowBinding = {
							typeName: 'binding',
							id,
							type: 'arrow',
							fromId: arrow.id,
							toId: end.boundShapeId,
							meta: {},
							props: {
								terminal: 'end',
								normalizedAnchor: end.normalizedAnchor,
								isExact: end.isExact,
								isPrecise: end.isPrecise,
							},
						}

						oldStore[id] = binding
						arrow.props.end = { x: 0, y: 0 }
					} else {
						delete arrow.props.end.type
					}
				}
			},
		},
	],
})
