import { T } from '@tldraw/validate'
import { b64Vecs } from '../misc/b64Vecs'
import { VecModel } from '../misc/geometry-types'
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
	/**
	 * Delta-encoded base64 path data.
	 * First point stored as Float32 (12 bytes) for precision, subsequent points as Float16 deltas (6 bytes each).
	 */
	path: string
}

/**
 * Validator for draw shape segments ensuring proper structure and data types.
 *
 * @public
 */
export const DrawShapeSegment: T.ObjectValidator<TLDrawShapeSegment> = T.object({
	type: T.literalEnum('free', 'straight'),
	path: T.string,
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
	/** Horizontal scale factor for lazy resize */
	scaleX: number
	/** Vertical scale factor for lazy resize */
	scaleY: number
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
/** @public */
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
	scaleX: T.nonZeroFiniteNumber,
	scaleY: T.nonZeroFiniteNumber,
}

const Versions = createShapePropsMigrationIds('draw', {
	AddInPen: 1,
	AddScale: 2,
	Base64: 3,
	LegacyPointsConversion: 4,
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
		{
			id: Versions.Base64,
			up: (props) => {
				// Convert VecModel[] arrays directly to delta-encoded base64 in 'path'
				props.segments = props.segments.map((segment: any) => {
					if (segment.path !== undefined) return segment
					const { points, ...rest } = segment
					const vecModels = Array.isArray(points) ? points : b64Vecs._legacyDecodePoints(points)
					return {
						...rest,
						path: b64Vecs.encodePoints(vecModels),
					}
				})
				props.scaleX = props.scaleX ?? 1
				props.scaleY = props.scaleY ?? 1
			},
			down: (props) => {
				// Convert delta-encoded 'path' back to VecModel[] arrays in 'points'
				props.segments = props.segments.map((segment: any) => {
					const { path, ...rest } = segment
					return {
						...rest,
						points: b64Vecs.decodePoints(path),
					}
				})
				delete props.scaleX
				delete props.scaleY
			},
		},
		{
			id: Versions.LegacyPointsConversion,
			up: (props) => {
				// Handle legacy data that was already migrated to v3 with absolute Float16 in 'points'
				// Convert 'points' to delta-encoded 'path'
				props.segments = props.segments.map((segment: any) => {
					// If segment already has 'path', it's already in the new format
					if (segment.path !== undefined) return segment

					const { points, ...rest } = segment
					const vecModels = Array.isArray(points) ? points : b64Vecs._legacyDecodePoints(points)
					return {
						...rest,
						path: b64Vecs.encodePoints(vecModels),
					}
				})
			},
			down: (_props) => {
				// handled by the previous down migration
			},
		},
	],
})

/**
 * Compress legacy draw shape segments by converting VecModel[] points to delta-encoded base64 format.
 * This function is useful for converting old draw shape data to the new compressed format.
 * Uses delta encoding for improved Float16 precision.
 *
 * @public
 */
export function compressLegacySegments(
	segments: {
		type: 'free' | 'straight'
		points: VecModel[]
	}[]
): TLDrawShapeSegment[] {
	return segments.map((segment) => ({
		type: segment.type,
		path: b64Vecs.encodePoints(segment.points),
	}))
}
