import { VecModel } from '../misc/geometry-types'
import { TLBaseShape } from './TLBaseShape'

/**
 * Defines cropping parameters for shapes that support cropping.
 *
 * Specifies the visible area of an asset (like an image or video) within a shape.
 * The crop is defined by top-left and bottom-right coordinates in normalized space (0-1),
 * where (0,0) is the top-left of the original asset and (1,1) is the bottom-right.
 *
 * @example
 * ```ts
 * // Crop the center 50% of an image
 * const centerCrop: TLShapeCrop = {
 *   topLeft: { x: 0.25, y: 0.25 },
 *   bottomRight: { x: 0.75, y: 0.75 }
 * }
 *
 * // Crop for a circular image shape
 * const circleCrop: TLShapeCrop = {
 *   topLeft: { x: 0, y: 0 },
 *   bottomRight: { x: 1, y: 1 },
 *   isCircle: true
 * }
 * ```
 *
 * @public
 */
export interface TLShapeCrop {
	topLeft: VecModel
	bottomRight: VecModel
	isCircle?: boolean
}

/**
 * A shape type that supports cropping functionality.
 *
 * This type represents any shape that can display cropped content, typically media shapes
 * like images and videos. The shape has width, height, and optional crop parameters.
 * When crop is null, the entire asset is displayed.
 *
 * @example
 * ```ts
 * // An image shape with cropping
 * const croppedImageShape: ShapeWithCrop = {
 *   id: 'shape:image1',
 *   type: 'image',
 *   x: 100,
 *   y: 200,
 *   // ... other base shape properties
 *   props: {
 *     w: 300,
 *     h: 200,
 *     crop: {
 *       topLeft: { x: 0.1, y: 0.1 },
 *       bottomRight: { x: 0.9, y: 0.9 }
 *     }
 *   }
 * }
 *
 * // A shape without cropping (shows full asset)
 * const fullImageShape: ShapeWithCrop = {
 *   // ... shape properties
 *   props: {
 *     w: 400,
 *     h: 300,
 *     crop: null // Shows entire asset
 *   }
 * }
 * ```
 *
 * @public
 */
export type ShapeWithCrop = TLBaseShape<string, { w: number; h: number; crop: TLShapeCrop | null }>
