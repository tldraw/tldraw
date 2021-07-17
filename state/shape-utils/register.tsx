import React from 'react'
import {
  vec,
  pointInBounds,
  getBoundsCenter,
  getBoundsFromPoints,
  getRotatedCorners,
  boundsContainPolygon,
} from 'utils'
import Intersect from 'utils/intersect'
import { BindingChangeType, Shape, ShapeUtility } from 'types'

function getDefaultShapeUtil<T extends Shape>(): ShapeUtility<T> {
  return {
    boundsCache: new WeakMap(),
    canTransform: true,
    canChangeAspectRatio: true,
    canStyleFill: true,
    canEdit: false,
    canBind: false,
    isShy: false,
    isParent: false,
    isForeignObject: false,

    defaultProps: {} as T,

    create(props) {
      return {
        ...this.defaultProps,
        ...props,
        style: {
          ...this.defaultProps.style,
          ...props.style,
          isFilled: this.canStyleFill
            ? props.style?.isFilled || this.defaultProps.style.isFilled
            : false,
        },
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

    onBindingChange(shape, change) {
      switch (change.type) {
        case BindingChangeType.Create: {
          this.setProperty(shape, 'bindings', [
            ...(shape.bindings || []),
            change.id,
          ])
          break
        }
        case BindingChangeType.Delete: {
          this.setProperty(
            shape,
            'bindings',
            shape.bindings.filter((id) => id !== change.id)
          )
          break
        }
      }
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

    getBindingPoint() {
      return undefined
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
        Intersect.bounds.polyline(brushBounds, rotatedCorners).length > 0
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

    shouldRender() {
      return true
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
