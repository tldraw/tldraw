import {
  Bounds,
  Shape,
  ShapeType,
  Corner,
  Edge,
  ShapeStyles,
  ShapeHandle,
  ShapeBinding,
  BaseShape,
  ShapeSpecificProps,
  Mutable,
} from 'types'
import { v4 as uuid } from 'uuid'
import circle from './circle'
import dot from './dot'
import polyline from './polyline'
import rectangle from './rectangle'
import ellipse from './ellipse'
import line from './line'
import ray from './ray'
import draw from './draw'
import arrow from './arrow'
import rectangleUtils from '../shapes/Rectangle'
import {
  getBoundsCenter,
  getBoundsFromPoints,
  getRotatedCorners,
} from 'utils/utils'
import shape from 'components/canvas/shape'
import {
  boundsCollidePolygon,
  boundsContainPolygon,
  pointInBounds,
} from 'utils/bounds'

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

  // Whether to show transform controls when this shape is selected.
  canTransform: boolean

  // Whether the shape's aspect ratio can change
  canChangeAspectRatio: boolean

  // Whether the shape's style can be filled
  canStyleFill: boolean

  // Create a new shape.
  create(props: Partial<K>): K

  applyStyles(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    style: Partial<ShapeStyles>
  ): ShapeUtility<K>

  // Transform to fit a new bounding box when more than one shape is selected.
  transform(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
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
    shape: Mutable<K>,
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
    shape: Mutable<K>,
    prop: P,
    value: K[P]
  ): ShapeUtility<K>

  // Respond when a user moves one of the shape's bound elements.
  onBindingMove?(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    bindings: Record<string, ShapeBinding>
  ): ShapeUtility<K>

  // Respond when a user moves one of the shape's handles.
  onHandleMove?(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    handle: Partial<K['handles']>
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
  [ShapeType.Arrow]: arrow,
}

/**
 * A helper to retrieve a shape utility based on a shape object.
 * @param shape
 * @returns
 */
export function getShapeUtils<T extends Shape>(shape: T): ShapeUtility<T> {
  return shapeUtilityMap[shape.type] as ShapeUtility<T>
}

function getDefaultShapeUtil<T extends Shape>(): ShapeUtility<T> {
  return {
    boundsCache: new WeakMap(),
    canTransform: true,
    canChangeAspectRatio: true,
    canStyleFill: true,

    create(props) {
      return {
        id: uuid(),
        isGenerated: false,
        point: [0, 0],
        name: 'Shape',
        parentId: 'page0',
        childIndex: 0,
        rotation: 0,
        isAspectRatioLocked: false,
        isLocked: false,
        isHidden: false,
        ...props,
      } as T
    },

    render(shape) {
      return <circle id={shape.id} />
    },

    transform(shape, bounds) {
      shape.point = [bounds.minX, bounds.minY]
      return this
    },

    transformSingle(shape, bounds, info) {
      return this.transform(shape, bounds, info)
    },

    onBindingMove() {
      return this
    },

    onHandleMove() {
      return this
    },

    getBounds(shape) {
      const [x, y] = shape.point
      return {
        minX: x,
        minY: y,
        maxX: x + 1,
        maxY: y + 1,
        width: 1,
        height: 1,
      }
    },

    getRotatedBounds(shape) {
      return getBoundsFromPoints(
        getRotatedCorners(this.getBounds(shape), shape.rotation)
      )
    },

    getCenter(shape) {
      return getBoundsCenter(this.getBounds(shape))
    },

    hitTest(shape, point) {
      return pointInBounds(point, this.getBounds(shape))
    },

    hitTestBounds(shape, brushBounds) {
      const rotatedCorners = getRotatedCorners(
        this.getBounds(shape),
        shape.rotation
      )

      return (
        boundsContainPolygon(brushBounds, rotatedCorners) ||
        boundsCollidePolygon(brushBounds, rotatedCorners)
      )
    },

    setProperty(shape, prop, value) {
      shape[prop] = value
      return this
    },

    applyStyles(shape, style) {
      Object.assign(shape.style, style)
      return this
    },
  }
}

/**
 *  A factory of shape utilities, with typing enforced.
 * @param shape
 * @returns
 */
export function registerShapeUtils<K extends Shape>(
  shapeUtil: Partial<ShapeUtility<K>>
): ShapeUtility<K> {
  return Object.freeze({ ...getDefaultShapeUtil<K>(), ...shapeUtil })
}

export function createShape<T extends Shape>(
  type: T['type'],
  props: Partial<T>
) {
  return shapeUtilityMap[type].create(props) as T
}

export default shapeUtilityMap
