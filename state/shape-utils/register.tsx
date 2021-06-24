import { Shape, ShapeUtility } from 'types'
import vec from 'utils/vec'
import { getBoundsCenter, getBoundsFromPoints, getRotatedCorners } from 'utils'
import { boundsCollidePolygon, boundsContainPolygon } from 'utils/bounds'
import { uniqueId } from 'utils'
import React from 'react'
import { pointInBounds } from 'utils/hitTests'

function getDefaultShapeUtil<T extends Shape>(): ShapeUtility<T> {
  return {
    boundsCache: new WeakMap(),
    canTransform: true,
    canChangeAspectRatio: true,
    canStyleFill: true,
    canEdit: false,
    isShy: false,
    isParent: false,
    isForeignObject: false,

    create(props) {
      return {
        id: uniqueId(),
        isGenerated: false,
        point: [0, 0],
        name: 'Shape',
        parentId: 'page1',
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

    translateBy(shape, delta) {
      shape.point = vec.round(vec.add(shape.point, delta))
      return this
    },

    translateTo(shape, point) {
      shape.point = vec.round(point)
      return this
    },

    rotateTo(shape, rotation) {
      shape.rotation = rotation
      return this
    },

    rotateBy(shape, rotation) {
      shape.rotation += rotation
      return this
    },

    transform(shape, bounds) {
      shape.point = [bounds.minX, bounds.minY]
      return this
    },

    transformSingle(shape, bounds, info) {
      return this.transform(shape, bounds, info)
    },

    onChildrenChange() {
      return this
    },

    onBindingChange() {
      return this
    },

    onHandleChange() {
      return this
    },

    onDoublePointHandle() {
      return this
    },

    onDoubleFocus() {
      return this
    },

    onBoundsReset() {
      return this
    },

    onSessionComplete() {
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

    shouldDelete() {
      return false
    },

    invalidate(shape) {
      this.boundsCache.delete(shape)
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
