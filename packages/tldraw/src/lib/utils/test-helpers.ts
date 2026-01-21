import type { TLDrawShapeSegment, VecModel } from '@tldraw/editor'
import { b64Vecs, compressLegacySegments } from '@tldraw/editor'

/**
 * Helper function to convert draw shape points from VecModel[] to base64 string.
 * Uses delta encoding for improved Float16 precision.
 * This is useful for tests that create draw shapes with the legacy array format.
 *
 * @example
 * ```ts
 * const segments = [{ type: 'free', path: pointsToBase64([{x: 0, y: 0, z: 0.5}]) }]
 * ```
 *
 * @public
 */
export function pointsToBase64(points: VecModel[]): string {
	return b64Vecs.encodePoints(points)
}

/**
 * Helper function to convert base64 string back to VecModel[] points.
 * Decodes delta-encoded points to absolute coordinates.
 * This is useful for tests that need to inspect draw shape points.
 *
 * @example
 * ```ts
 * const points = base64ToPoints(shape.props.segments[0].path)
 * expect(points[0].x).toBe(0)
 * ```
 *
 * @public
 */
export function base64ToPoints(base64: string): VecModel[] {
	return b64Vecs.decodePoints(base64)
}

/**
 * Helper function to create draw shape segments from legacy array format.
 * This allows tests to use the old format while the shape uses the new base64 format.
 *
 * @example
 * ```ts
 * editor.createShapes([{
 *   type: 'draw',
 *   props: {
 *     segments: createDrawSegments([[{x: 0, y: 0}, {x: 10, y: 10}]])
 *   }
 * }])
 * ```
 * @public
 */
export function createDrawSegments(
	pointArrays: VecModel[][],
	type: 'free' | 'straight' = 'free'
): TLDrawShapeSegment[] {
	return compressLegacySegments(
		pointArrays.map((points) => ({
			type,
			points,
		}))
	)
}
