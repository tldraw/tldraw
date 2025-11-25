import { T } from '@tldraw/validate'
import { VecModel, vecModelValidator } from '../misc/geometry-types'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle, TLDefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle, TLDefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

/**
 * A segment of a draw shape representing either freehand drawing or straight line segments.
 *
 * @public
 */
export interface TLDrawShapeSegment {
	/** Type of drawing segment - 'free' for freehand curves, 'straight' for line segments */
	type: 'free' | 'straight'
	/** Array of points defining the segment path with x, y coordinates and pressure (z) */
	points: VecModel[]
}

/**
 * Validator for draw shape segments ensuring proper structure and data types.
 *
 * @public
 * @example
 * ```ts
 * const segment: TLDrawShapeSegment = {
 *   type: 'free',
 *   points: [{ x: 0, y: 0, z: 0.5 }, { x: 10, y: 10, z: 0.7 }]
 * }
 * const isValid = DrawShapeSegment.isValid(segment)
 * ```
 */
export const DrawShapeSegment: T.ObjectValidator<TLDrawShapeSegment> = T.object({
	type: T.literalEnum('free', 'straight'),
	points: T.arrayOf(vecModelValidator),
})

/**
 * Properties for the draw shape, which represents freehand drawing and sketching.
 *
 * @public
 */
export interface TLDrawShapeProps {
	/** Color style for the drawing stroke */
	color: TLDefaultColorStyle
	/** Fill style for closed drawing shapes */
	fill: TLDefaultFillStyle
	/** Dash pattern style for the stroke */
	dash: TLDefaultDashStyle
	/** Size/thickness of the drawing stroke */
	size: TLDefaultSizeStyle
	/** Array of segments that make up the complete drawing path */
	segments: TLDrawShapeSegment[]
	/** Whether the drawing is complete (user finished drawing) */
	isComplete: boolean
	/** Whether the drawing path forms a closed shape */
	isClosed: boolean
	/** Whether this drawing was created with a pen/stylus device */
	isPen: boolean
	/** Scale factor applied to the drawing */
	scale: number
}

/**
 * A draw shape represents freehand drawing, sketching, and pen input on the canvas.
 * Draw shapes are composed of segments that can be either smooth curves or straight lines.
 *
 * @public
 * @example
 * ```ts
 * const drawShape: TLDrawShape = {
 *   id: createShapeId(),
 *   typeName: 'shape',
 *   type: 'draw',
 *   x: 50,
 *   y: 50,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:page1',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     color: 'black',
 *     fill: 'none',
 *     dash: 'solid',
 *     size: 'm',
 *     segments: [{
 *       type: 'free',
 *       points: [{ x: 0, y: 0, z: 0.5 }, { x: 20, y: 15, z: 0.6 }]
 *     }],
 *     isComplete: true,
 *     isClosed: false,
 *     isPen: false,
 *     scale: 1
 *   },
 *   meta: {}
 * }
 * ```
 */
export type TLDrawShape = TLBaseShape<'draw', TLDrawShapeProps>

/**
 * Validation schema for draw shape properties.
 *
 * @public
 * @example
 * ```ts
 * // Validate draw shape properties
 * const props = {
 *   color: 'red',
 *   fill: 'solid',
 *   segments: [{ type: 'free', points: [] }],
 *   isComplete: true
 * }
 * const isValid = drawShapeProps.color.isValid(props.color)
 * ```
 */
export const drawShapeProps: RecordProps<TLDrawShape> = {
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	segments: T.arrayOf(DrawShapeSegment),
	isComplete: T.boolean,
	isClosed: T.boolean,
	isPen: T.boolean,
	scale: T.nonZeroNumber,
}

const Versions = createShapePropsMigrationIds('draw', {
	AddInPen: 1,
	AddScale: 2,
})

/**
 * Version identifiers for draw shape migrations.
 *
 * @public
 */
export { Versions as drawShapeVersions }

/**
 * Migration sequence for draw shape properties across different schema versions.
 * Handles adding pen detection and scale properties to existing draw shapes.
 *
 * @public
 */
export const drawShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddInPen,
			up: (props) => {
				// Rather than checking to see whether the shape is a pen at runtime,
				// from now on we're going to use the type of device reported to us
				// as well as the pressure data received; but for existing shapes we
				// need to check the pressure data to see if it's a pen or not.

				const { points } = props.segments[0]

				if (points.length === 0) {
					props.isPen = false
					return
				}

				let isPen = !(points[0].z === 0 || points[0].z === 0.5)

				if (points[1]) {
					// Double check if we have a second point (we probably should)
					isPen = isPen && !(points[1].z === 0 || points[1].z === 0.5)
				}
				props.isPen = isPen
			},
			down: 'retired',
		},
		{
			id: Versions.AddScale,
			up: (props) => {
				props.scale = 1
			},
			down: (props) => {
				delete props.scale
			},
		},
	],
})
