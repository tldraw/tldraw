import {
  Bounds,
  BoundsSnapshot,
  Shape,
  Shapes,
  ShapeType,
  TransformCorner,
  TransformEdge,
} from "types"
import circle from "./circle"
import dot from "./dot"
import polyline from "./polyline"
import rectangle from "./rectangle"
import ellipse from "./ellipse"
import line from "./line"
import ray from "./ray"

/*
Shape Utiliies

A shape utility is an object containing utility methods for each type of shape
in the application. While shapes may be very different, each shape must support
a common set of utility methods, such as hit tests or translations, that 

Operations throughout the app will call these utility methods
when performing tests (such as hit tests) or mutations, such as translations.
*/

export interface ShapeUtility<K extends Shape> {
  // A cache for the computed bounds of this kind of shape.
  boundsCache: WeakMap<K, Bounds>

  // Create a new shape.
  create(props: Partial<K>): K

  // Get the bounds of the a shape.
  getBounds(this: ShapeUtility<K>, shape: K): Bounds

  // Get the routated bounds of the a shape.
  getRotatedBounds(this: ShapeUtility<K>, shape: K): Bounds

  // Get the center of the shape
  getCenter(this: ShapeUtility<K>, shape: K): number[]

  // Test whether a point lies within a shape.
  hitTest(this: ShapeUtility<K>, shape: K, test: number[]): boolean

  // Test whether bounds collide with or contain a shape.
  hitTestBounds(this: ShapeUtility<K>, shape: K, bounds: Bounds): boolean

  // Apply a rotation to a shape.
  rotate(this: ShapeUtility<K>, shape: K): K

  // Apply a translation to a shape.
  translate(this: ShapeUtility<K>, shape: K, delta: number[]): K

  // Transform to fit a new bounding box.
  transform(
    this: ShapeUtility<K>,
    shape: K,
    bounds: Bounds,
    info: {
      type: TransformEdge | TransformCorner
      initialShape: K
      scaleX: number
      scaleY: number
    }
  ): K

  transformSingle(
    this: ShapeUtility<K>,
    shape: K,
    bounds: Bounds,
    info: {
      type: TransformEdge | TransformCorner
      initialShape: K
      scaleX: number
      scaleY: number
    }
  ): K

  // Apply a scale to a shape.
  scale(this: ShapeUtility<K>, shape: K, scale: number): K

  // Render a shape to JSX.
  render(this: ShapeUtility<K>, shape: K): JSX.Element

  // Whether to show transform controls when this shape is selected.
  canTransform: boolean
}

// A mapping of shape types to shape utilities.
const shapeUtilityMap: { [key in ShapeType]: ShapeUtility<Shapes[key]> } = {
  [ShapeType.Circle]: circle,
  [ShapeType.Dot]: dot,
  [ShapeType.Polyline]: polyline,
  [ShapeType.Rectangle]: rectangle,
  [ShapeType.Ellipse]: ellipse,
  [ShapeType.Line]: line,
  [ShapeType.Ray]: ray,
}

/**
 * A helper to retrieve a shape utility based on a shape object.
 * @param shape
 * @returns
 */
export function getShapeUtils(shape: Shape): ShapeUtility<typeof shape> {
  return shapeUtilityMap[shape.type]
}

/**
 *  A factory of shape utilities, with typing enforced.
 * @param shape
 * @returns
 */
export function registerShapeUtils<T extends Shape>(
  shape: ShapeUtility<T>
): ShapeUtility<T> {
  return Object.freeze(shape)
}

export default shapeUtilityMap
