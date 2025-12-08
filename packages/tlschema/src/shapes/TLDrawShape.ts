import { Float16Array } from '@petamoriken/float16'
import { T } from '@tldraw/validate'
import assert from 'assert'
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
	/** Base64-encoded Float16Array of points (x, y, z triplets) */
	points: string
}

/**
 * Validator for draw shape segments ensuring proper structure and data types.
 *
 * @public
 */
export const DrawShapeSegment: T.ObjectValidator<TLDrawShapeSegment> = T.object({
	type: T.literalEnum('free', 'straight'),
	points: T.string,
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
	scaleX: T.nonZeroNumber,
	scaleY: T.nonZeroNumber,
}

const Versions = createShapePropsMigrationIds('draw', {
	AddInPen: 1,
	AddScale: 2,
	Base64: 3,
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
				props.segments = props.segments.map((segment: any) => {
					const nums = segment.points.flatMap((p: VecModel) => [p.x, p.y, p.z ?? 0.5])
					const float16Array = new Float16Array(nums)
					const base64 = float16ArrayToBase64(float16Array)
					return {
						...segment,
						points: base64,
					}
				})
				props.scaleX = 1
				props.scaleY = 1
			},
		},
	],
})

/**
 * Convert a Float16Array to a base64 string for compact storage.
 *
 * @public
 */
export function float16ArrayToBase64(float16Array: Float16Array) {
	// Convert Float16Array to Uint8Array by accessing the underlying buffer
	const uint8Array = new Uint8Array(
		float16Array.buffer,
		float16Array.byteOffset,
		float16Array.byteLength
	)

	// Base64 alphabet
	const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	let result = ''

	// Process bytes in groups of 3
	for (let i = 0; i < uint8Array.length; i += 3) {
		// Get up to 3 bytes
		const byte1 = uint8Array[i]
		const byte2 = i + 1 < uint8Array.length ? uint8Array[i + 1] : 0
		const byte3 = i + 2 < uint8Array.length ? uint8Array[i + 2] : 0

		// Convert 3 bytes (24 bits) to 4 base64 characters (6 bits each)
		const bitmap = (byte1 << 16) | (byte2 << 8) | byte3

		result += base64Chars[(bitmap >> 18) & 63]
		result += base64Chars[(bitmap >> 12) & 63]
		result += i + 1 < uint8Array.length ? base64Chars[(bitmap >> 6) & 63] : '='
		result += i + 2 < uint8Array.length ? base64Chars[bitmap & 63] : '='
	}

	return result
}

/**
 * Convert a base64 string back to a Float16Array.
 *
 * @public
 */
export function base64ToFloat16Array(base64: string): Float16Array {
	assert(base64.length % 8 === 0 && !base64.endsWith('='), 'Base64 string must be a multiple of 8')
	// Base64 alphabet (same as in float16ArrayToBase64)
	const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

	// Calculate exact number of bytes (4 base64 chars = 3 bytes)
	const numBytes = Math.floor((base64.length * 3) / 4)

	// Pre-allocate the exact size we need
	const bytes = new Uint8Array(numBytes)
	let byteIndex = 0

	// Process in groups of 4 base64 characters
	for (let i = 0; i < base64.length; i += 4) {
		// Get 4 base64 characters (24 bits)
		const char1 = base64Chars.indexOf(base64[i] || 'A')
		const char2 = base64Chars.indexOf(base64[i + 1] || 'A')
		const char3 = base64Chars.indexOf(base64[i + 2] || 'A')
		const char4 = base64Chars.indexOf(base64[i + 3] || 'A')

		// Convert back to 3 bytes
		const bitmap = (char1 << 18) | (char2 << 12) | (char3 << 6) | char4

		bytes[byteIndex++] = (bitmap >> 16) & 255
		if (i + 1 < base64.length) bytes[byteIndex++] = (bitmap >> 8) & 255
		if (i + 2 < base64.length) bytes[byteIndex++] = bitmap & 255
	}

	// Create Float16Array from the buffer
	return new Float16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2)
}
