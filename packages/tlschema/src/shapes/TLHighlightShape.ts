import { T } from '@tldraw/validate'
import { b64Vecs } from '../misc/b64Vecs'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'
import { DrawShapeSegment, TLDrawShapeSegment } from './TLDrawShape'

/**
 * Properties for a highlight shape. Highlight shapes represent highlighting strokes made with
 * a highlighting tool, typically used to emphasize or mark up content.
 *
 * @public
 * @example
 * ```ts
 * const highlightProps: TLHighlightShapeProps = {
 *   color: 'yellow',
 *   size: 'm',
 *   segments: [{ type: 'straight', points: [{ x: 0, y: 0, z: 0.5 }] }],
 *   isComplete: true,
 *   isPen: false,
 *   scale: 1
 * }
 * ```
 */
export interface TLHighlightShapeProps {
	/** The color style of the highlight stroke */
	color: TLDefaultColorStyle
	/** The size style determining the thickness of the highlight stroke */
	size: TLDefaultSizeStyle
	/** Array of segments that make up the highlight stroke path */
	segments: TLDrawShapeSegment[]
	/** Whether the highlight stroke has been completed by the user */
	isComplete: boolean
	/** Whether the highlight was drawn with a pen/stylus (affects rendering style) */
	isPen: boolean
	/** Scale factor applied to the highlight shape for display */
	scale: number
	/** Horizontal scale factor for lazy resize */
	scaleX: number
	/** Vertical scale factor for lazy resize */
	scaleY: number
}

/**
 * A highlight shape representing a highlighting stroke drawn by the user. Highlight shapes
 * are typically semi-transparent and used for marking up or emphasizing content on the canvas.
 *
 * @public
 * @example
 * ```ts
 * const highlightShape: TLHighlightShape = {
 *   id: 'shape:highlight1',
 *   type: 'highlight',
 *   x: 100,
 *   y: 50,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:main',
 *   isLocked: false,
 *   opacity: 0.7,
 *   props: {
 *     color: 'yellow',
 *     size: 'l',
 *     segments: [],
 *     isComplete: false,
 *     isPen: false,
 *     scale: 1
 *   },
 *   meta: {},
 *   typeName: 'shape'
 * }
 * ```
 */
export type TLHighlightShape = TLBaseShape<'highlight', TLHighlightShapeProps>

/**
 * Validation schema for highlight shape properties. Defines the runtime validation rules
 * for all properties of highlight shapes.
 *
 * @public
 * @example
 * ```ts
 * import { highlightShapeProps } from '@tldraw/tlschema'
 *
 * // Used internally by the validation system
 * const validator = T.object(highlightShapeProps)
 * const validatedProps = validator.validate(someHighlightProps)
 * ```
 */
/** @public */
export const highlightShapeProps: RecordProps<TLHighlightShape> = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	segments: T.arrayOf(DrawShapeSegment),
	isComplete: T.boolean,
	isPen: T.boolean,
	scale: T.nonZeroNumber,
	scaleX: T.nonZeroFiniteNumber,
	scaleY: T.nonZeroFiniteNumber,
}

const Versions = createShapePropsMigrationIds('highlight', {
	AddScale: 1,
	Base64: 2,
})

/**
 * Version identifiers for highlight shape migrations. These version numbers track
 * schema changes over time to enable proper data migration.
 *
 * @public
 */
export { Versions as highlightShapeVersions }

/**
 * Migration sequence for highlight shapes. Handles schema evolution over time by defining
 * how to upgrade and downgrade highlight shape data between different versions.
 *
 * @public
 */
export const highlightShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
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
				props.segments = props.segments.map((segment: any) => {
					return {
						...segment,
						// Only encode if points is an array (not already base64 string)
						points:
							typeof segment.points === 'string'
								? segment.points
								: b64Vecs.encodePoints(segment.points),
					}
				})
				props.scaleX = props.scaleX ?? 1
				props.scaleY = props.scaleY ?? 1
			},
			down: (props) => {
				props.segments = props.segments.map((segment: any) => ({
					...segment,
					// Only decode if points is a string (not already VecModel[])
					points: Array.isArray(segment.points)
						? segment.points
						: b64Vecs.decodePoints(segment.points),
				}))
				delete props.scaleX
				delete props.scaleY
			},
		},
	],
})
