import { createMigrationSequence } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLRichText, richTextValidator, toRichText } from '../misc/TLRichText'
import { VecModel, vecModelValidator } from '../misc/geometry-types'
import { createBindingId } from '../records/TLBinding'
import { TLShapeId, createShapePropsMigrationIds } from '../records/TLShape'
import { RecordProps, TLPropsMigration, createPropsMigration } from '../recordsWithProps'
import { StyleProp } from '../styles/StyleProp'
import {
	DefaultColorStyle,
	DefaultLabelColorStyle,
	TLDefaultColorStyle,
} from '../styles/TLColorStyle'
import { DefaultDashStyle, TLDefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle, TLDefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle, TLDefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

const arrowKinds = ['arc', 'elbow'] as const
/**
 * Style property for arrow shape kind, determining how the arrow is drawn.
 *
 * Arrows can be drawn as arcs (curved) or elbows (angled with straight segments).
 * This affects the visual appearance and behavior of arrow shapes.
 *
 * @example
 * ```ts
 * // Create an arrow with arc style (curved)
 * const arcArrow: TLArrowShape = {
 *   // ... other properties
 *   props: {
 *     kind: 'arc',
 *     // ... other props
 *   }
 * }
 *
 * // Create an arrow with elbow style (angled)
 * const elbowArrow: TLArrowShape = {
 *   // ... other properties
 *   props: {
 *     kind: 'elbow',
 *     // ... other props
 *   }
 * }
 * ```
 *
 * @public
 */
export const ArrowShapeKindStyle = StyleProp.defineEnum('tldraw:arrowKind', {
	defaultValue: 'arc',
	values: arrowKinds,
})

/**
 * The type representing arrow shape kinds.
 *
 * @public
 */
export type TLArrowShapeKind = T.TypeOf<typeof ArrowShapeKindStyle>

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

/**
 * Style property for the arrowhead at the start of an arrow.
 *
 * Defines the visual style of the arrowhead at the beginning of the arrow path.
 * Can be one of several predefined styles or none for no arrowhead.
 *
 * @example
 * ```ts
 * // Arrow with no start arrowhead but triangle end arrowhead
 * const arrow: TLArrowShape = {
 *   // ... other properties
 *   props: {
 *     arrowheadStart: 'none',
 *     arrowheadEnd: 'triangle',
 *     // ... other props
 *   }
 * }
 * ```
 *
 * @public
 */
export const ArrowShapeArrowheadStartStyle = StyleProp.defineEnum('tldraw:arrowheadStart', {
	defaultValue: 'none',
	values: arrowheadTypes,
})

/**
 * Style property for the arrowhead at the end of an arrow.
 *
 * Defines the visual style of the arrowhead at the end of the arrow path.
 * Defaults to 'arrow' style, giving arrows their characteristic pointed appearance.
 *
 * @example
 * ```ts
 * // Arrow with different start and end arrowheads
 * const doubleArrow: TLArrowShape = {
 *   // ... other properties
 *   props: {
 *     arrowheadStart: 'triangle',
 *     arrowheadEnd: 'diamond',
 *     // ... other props
 *   }
 * }
 * ```
 *
 * @public
 */
export const ArrowShapeArrowheadEndStyle = StyleProp.defineEnum('tldraw:arrowheadEnd', {
	defaultValue: 'arrow',
	values: arrowheadTypes,
})

/**
 * The type representing arrowhead styles for both start and end of arrows.
 *
 * @public
 */
export type TLArrowShapeArrowheadStyle = T.TypeOf<typeof ArrowShapeArrowheadStartStyle>

/**
 * Properties specific to arrow shapes.
 *
 * Defines all the configurable aspects of an arrow shape, including visual styling,
 * geometry, text labeling, and positioning. Arrows can connect two points and
 * optionally display text labels.
 *
 * @example
 * ```ts
 * const arrowProps: TLArrowShapeProps = {
 *   kind: 'arc',
 *   labelColor: 'black',
 *   color: 'blue',
 *   fill: 'none',
 *   dash: 'solid',
 *   size: 'm',
 *   arrowheadStart: 'none',
 *   arrowheadEnd: 'arrow',
 *   font: 'draw',
 *   start: { x: 0, y: 0 },
 *   end: { x: 100, y: 100 },
 *   bend: 0.2,
 *   richText: toRichText('Label'),
 *   labelPosition: 0.5,
 *   scale: 1,
 *   elbowMidPoint: 0.5
 * }
 * ```
 *
 * @public
 */
export interface TLArrowShapeProps {
	kind: TLArrowShapeKind
	labelColor: TLDefaultColorStyle
	color: TLDefaultColorStyle
	fill: TLDefaultFillStyle
	dash: TLDefaultDashStyle
	size: TLDefaultSizeStyle
	arrowheadStart: TLArrowShapeArrowheadStyle
	arrowheadEnd: TLArrowShapeArrowheadStyle
	font: TLDefaultFontStyle
	start: VecModel
	end: VecModel
	bend: number
	richText: TLRichText
	labelPosition: number
	scale: number
	elbowMidPoint: number
}

/**
 * A complete arrow shape record.
 *
 * Combines the base shape interface with arrow-specific properties to create
 * a full arrow shape that can be stored and manipulated in the editor.
 *
 * @example
 * ```ts
 * const arrowShape: TLArrowShape = {
 *   id: 'shape:arrow123',
 *   typeName: 'shape',
 *   type: 'arrow',
 *   x: 100,
 *   y: 200,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:main',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     kind: 'arc',
 *     start: { x: 0, y: 0 },
 *     end: { x: 150, y: 100 },
 *     // ... other props
 *   },
 *   meta: {}
 * }
 * ```
 *
 * @public
 */
export type TLArrowShape = TLBaseShape<'arrow', TLArrowShapeProps>

/**
 * Validation configuration for arrow shape properties.
 *
 * Defines the validators for each property of an arrow shape, ensuring that
 * arrow shape data is valid and conforms to the expected types and constraints.
 *
 * @example
 * ```ts
 * // The validators ensure proper typing and validation
 * const validator = T.object(arrowShapeProps)
 * const validArrowProps = validator.validate({
 *   kind: 'arc',
 *   start: { x: 0, y: 0 },
 *   end: { x: 100, y: 50 },
 *   // ... other required properties
 * })
 * ```
 *
 * @public
 */
export const arrowShapeProps: RecordProps<TLArrowShape> = {
	kind: ArrowShapeKindStyle,
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
	richText: richTextValidator,
	labelPosition: T.number,
	scale: T.nonZeroNumber,
	elbowMidPoint: T.number,
}

/**
 * Migration version identifiers for arrow shape properties.
 *
 * These track the evolution of the arrow shape schema over time, with each
 * version representing a specific change to the arrow shape structure or properties.
 *
 * @example
 * ```ts
 * // Used internally for migration system
 * if (version < arrowShapeVersions.AddLabelColor) {
 *   // Apply label color migration
 * }
 * ```
 *
 * @public
 */
export const arrowShapeVersions = createShapePropsMigrationIds('arrow', {
	AddLabelColor: 1,
	AddIsPrecise: 2,
	AddLabelPosition: 3,
	ExtractBindings: 4,
	AddScale: 5,
	AddElbow: 6,
	AddRichText: 7,
})

function propsMigration(migration: TLPropsMigration) {
	return createPropsMigration<TLArrowShape>('shape', 'arrow', migration)
}

/**
 * Complete migration sequence for arrow shapes.
 *
 * Defines all the migrations needed to transform arrow shape data from older
 * versions to the current version. Each migration handles a specific schema change,
 * ensuring backward compatibility and smooth data evolution.
 *
 * @public
 */
export const arrowShapeMigrations = createMigrationSequence({
	sequenceId: 'com.tldraw.shape.arrow',
	retroactive: false,
	sequence: [
		propsMigration({
			id: arrowShapeVersions.AddLabelColor,
			up: (props) => {
				props.labelColor = 'black'
			},
			down: 'retired',
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
						const binding = {
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
						const binding = {
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
		propsMigration({
			id: arrowShapeVersions.AddScale,
			up: (props) => {
				props.scale = 1
			},
			down: (props) => {
				delete props.scale
			},
		}),
		propsMigration({
			id: arrowShapeVersions.AddElbow,
			up: (props) => {
				props.kind = 'arc'
				props.elbowMidPoint = 0.5
			},
			down: (props) => {
				delete props.kind
				delete props.elbowMidPoint
			},
		}),
		propsMigration({
			id: arrowShapeVersions.AddRichText,
			up: (props) => {
				props.richText = toRichText(props.text)
				delete props.text
			},
			// N.B. Explicitly no down state so that we force clients to update.
			// down: (props) => {
			// 	delete props.richText
			// },
		}),
	],
})
