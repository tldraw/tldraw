import { defaultStyle } from 'lib/shape-styles'
import {
  Shape,
  Bounds,
  BaseShape,
  ShapeSpecificProps,
  ShapeType,
  ShapeStyles,
  MutableShape,
  Edge,
  Corner,
  ShapeBinding,
} from 'types'
import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import {
  getBoundsCenter,
  getRotatedCorners,
  getBoundsFromPoints,
} from 'utils/utils'

class ShapeUtility<K extends MutableShape> {
  boundsCache = new WeakMap<K, Bounds>([])
  canTransform = true
  canChangeAspectRatio = true
  canStyleFill = true

  // Create a new shape.
  create(props: Partial<K> & ShapeSpecificProps<K>): K {
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
    } as K
  }

  applyStyles = (shape: K, style: Partial<ShapeStyles>) => {
    Object.assign(shape.style, style)
    return this
  }

  transform = (
    shape: K,
    bounds: Bounds,
    info: {
      type: Edge | Corner
      initialShape: K
      scaleX: number
      scaleY: number
      transformOrigin: number[]
    }
  ) => {
    shape.point = [bounds.minX, bounds.minY]

    return this
  }

  transformSingle = (
    shape: K,
    bounds: Bounds,
    info: {
      type: Edge | Corner
      initialShape: K
      scaleX: number
      scaleY: number
      transformOrigin: number[]
    }
  ) => {
    return this.transform(shape, bounds, info)
  }

  setProperty = <P extends keyof K>(shape: K, prop: P, value: K[P]) => {
    shape[prop] = value
    return this
  }

  onBindingMove? = (shape: K, bindings: Record<string, ShapeBinding>) => {
    return this
  }

  onHandleMove? = (shape: K, handle: Partial<K['handles']>) => {
    return this
  }

  render = (shape: K): JSX.Element => {
    return <circle id={shape.id} />
  }

  // Get the bounds of the a shape.
  getBounds = (shape: K): Bounds => {
    const [x, y] = shape.point
    return {
      minX: x,
      minY: y,
      maxX: x + 1,
      maxY: y + 1,
      width: 1,
      height: 1,
    }
  }

  // Get the routated bounds of the a shape.
  getRotatedBounds = (shape: K): Bounds => {
    return getBoundsFromPoints(
      getRotatedCorners(this.getBounds(shape), shape.rotation)
    )
  }

  // Get the center of the shape
  getCenter = (shape: K): number[] => {
    return getBoundsCenter(this.getBounds(shape))
  }

  // Test whether a point lies within a shape.
  hitTest = (shape: K, test: number[]): boolean => {
    return true
  }

  // Test whether bounds collide with or contain a shape.
  hitTestBounds = (shape: K, bounds: Bounds): boolean => {
    return true
  }
}
