import {
  Bounds,
  BoundsSnapshot,
  Shape,
  Shapes,
  ShapeType,
  Corner,
  Edge,
  ShapeByType,
  ShapeStyles,
  PropsOfType,
} from 'types'
import circle from './circle'
import dot from './dot'
import polyline from './polyline'
import rectangle from './rectangle'
import ellipse from './ellipse'
import line from './line'
import ray from './ray'
import draw from './draw'

/*
Shape Utiliies

A shape utility is an object containing utility methods for each type of shape
in the application. While shapes may be very different, each shape must support
a common set of utility methods, such as hit tests or translations, that 

Operations throughout the app will call these utility methods
when performing tests (such as hit tests) or mutations, such as translations.
*/

export interface ShapeUtility<K extends Readonly<Shape>> {
  // A cache for the computed bounds of this kind of shape.
  boundsCache: WeakMap<K, Bounds>

  // Whether to show transform controls when this shape is selected.
  canTransform: boolean

  // Whether the shape's aspect ratio can change
  canChangeAspectRatio: boolean

  // Create a new shape.
  create(props: Partial<K>): K

  applyStyles(
    this: ShapeUtility<K>,
    shape: K,
    style: ShapeStyles
  ): ShapeUtility<K>

  // Set the shape's point.
  translateTo(this: ShapeUtility<K>, shape: K, delta: number[]): ShapeUtility<K>

  // Set the shape's rotation.
  rotateTo(this: ShapeUtility<K>, shape: K, rotation: number): ShapeUtility<K>

  // Transform to fit a new bounding box when more than one shape is selected.
  transform(
    this: ShapeUtility<K>,
    shape: K,
    bounds: Bounds,
    info: {
      type: Edge | Corner
      initialShape: K
      scaleX: number
      scaleY: number
      transformOrigin: number[]
    }
  ): ShapeUtility<K>

  // Transform a single shape to fit a new bounding box.
  transformSingle(
    this: ShapeUtility<K>,
    shape: K,
    bounds: Bounds,
    info: {
      type: Edge | Corner
      initialShape: K
      scaleX: number
      scaleY: number
      transformOrigin: number[]
    }
  ): ShapeUtility<K>

  setProperty<P extends keyof K>(
    this: ShapeUtility<K>,
    shape: K,
    prop: P,
    value: K[P]
  ): ShapeUtility<K>

  // Render a shape to JSX.
  render(this: ShapeUtility<K>, shape: K): JSX.Element

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
}

// A mapping of shape types to shape utilities.
const shapeUtilityMap: Record<ShapeType, ShapeUtility<Shape>> = {
  [ShapeType.Circle]: circle,
  [ShapeType.Dot]: dot,
  [ShapeType.Polyline]: polyline,
  [ShapeType.Rectangle]: rectangle,
  [ShapeType.Ellipse]: ellipse,
  [ShapeType.Line]: line,
  [ShapeType.Ray]: ray,
  [ShapeType.Draw]: draw,
}

/**
 * A helper to retrieve a shape utility based on a shape object.
 * @param shape
 * @returns
 */
export function getShapeUtils<T extends Shape>(shape: T): ShapeUtility<T> {
  return shapeUtilityMap[shape.type] as ShapeUtility<T>
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

export function createShape<T extends Shape>(
  type: T['type'],
  props: Partial<T>
) {
  return shapeUtilityMap[type].create(props) as T
}

export default shapeUtilityMap
