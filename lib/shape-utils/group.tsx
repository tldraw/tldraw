import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import {
  GroupShape,
  RectangleShape,
  ShapeType,
  Bounds,
  Corner,
  Edge,
} from 'types'
import { getShapeUtils, registerShapeUtils } from './index'
import {
  getBoundsCenter,
  getCommonBounds,
  getRotatedCorners,
  rotateBounds,
  translateBounds,
} from 'utils/utils'
import { defaultStyle, getShapeStyle } from 'lib/shape-styles'
import styled from 'styles'
import { boundsContainPolygon } from 'utils/bounds'

const group = registerShapeUtils<GroupShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Group,
      isGenerated: false,
      name: 'Rectangle',
      parentId: 'page0',
      childIndex: 0,
      point: [0, 0],
      size: [1, 1],
      radius: 2,
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      style: defaultStyle,
      children: [],
      ...props,
    }
  },

  render(shape) {
    const { id, size } = shape

    return (
      <StyledGroupShape
        id={id}
        width={size[0]}
        height={size[1]}
        data-shy={true}
      />
    )
  },

  translateTo(shape, point) {
    shape.point = point
    return this
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const [width, height] = shape.size
      const bounds = {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      }

      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  hitTest() {
    return false
  },

  hitTestBounds(shape, brushBounds) {
    return false
  },

  transform(shape, bounds, { initialShape, transformOrigin, scaleX, scaleY }) {
    if (shape.rotation === 0 && !shape.isAspectRatioLocked) {
      shape.size = [bounds.width, bounds.height]
      shape.point = [bounds.minX, bounds.minY]
    } else {
      shape.size = vec.mul(
        initialShape.size,
        Math.min(Math.abs(scaleX), Math.abs(scaleY))
      )

      shape.point = [
        bounds.minX +
          (bounds.width - shape.size[0]) *
            (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
        bounds.minY +
          (bounds.height - shape.size[1]) *
            (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
      ]

      shape.rotation =
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
          ? -initialShape.rotation
          : initialShape.rotation
    }

    return this
  },

  transformSingle(shape, bounds) {
    shape.size = [bounds.width, bounds.height]
    shape.point = [bounds.minX, bounds.minY]
    return this
  },

  onChildrenChange(shape, children) {
    const childBounds = getCommonBounds(
      ...children.map((child) => getShapeUtils(child).getRotatedBounds(child))
    )

    // const c1 = this.getCenter(shape)
    // const c2 = getBoundsCenter(childBounds)

    // const [x0, y0] = vec.rotWith(shape.point, c1, shape.rotation)
    // const [w0, h0] = vec.rotWith(shape.size, c1, shape.rotation)
    // const [x1, y1] = vec.rotWith(
    //   [childBounds.minX, childBounds.minY],
    //   c2,
    //   shape.rotation
    // )
    // const [w1, h1] = vec.rotWith(
    //   [childBounds.width, childBounds.height],
    //   c2,
    //   shape.rotation
    // )

    // let delta: number[]

    // if (h0 === h1 && w0 !== w1) {
    //   if (x0 < x1) {
    //     // moving left edge, pin right edge
    //     delta = vec.sub([x1 + w1, y1 + h1 / 2], [x0 + w0, y0 + h0 / 2])
    //   } else {
    //     // moving right edge, pin left edge
    //     delta = vec.sub([x1, y1 + h1 / 2], [x0, y0 + h0 / 2])
    //   }
    // } else if (h0 !== h1 && w0 === w1) {
    //   if (y0 < y1) {
    //     // moving top edge, pin bottom edge
    //     delta = vec.sub([x1 + w1 / 2, y1 + h1], [x0 + w0 / 2, y0 + h0])
    //   } else {
    //     // moving bottom edge, pin top edge
    //     delta = vec.sub([x1 + w1 / 2, y1], [x0 + w0 / 2, y0])
    //   }
    // } else if (x0 !== x1) {
    //   if (y0 !== y1) {
    //     // moving top left, pin bottom right
    //     delta = vec.sub([x1 + w1, y1 + h1], [x0 + w0, y0 + h0])
    //   } else {
    //     // moving bottom left, pin top right
    //     delta = vec.sub([x1 + w1, y1], [x0 + w0, y0])
    //   }
    // } else if (y0 !== y1) {
    //   // moving top right, pin bottom left
    //   delta = vec.sub([x1, y1 + h1], [x0, y0 + h0])
    // } else {
    //   // moving bottom right, pin top left
    //   delta = vec.sub([x1, y1], [x0, y0])
    // }

    // if (shape.rotation !== 0) {
    //   shape.point = vec.sub(shape.point, delta)
    // }

    shape.point = [childBounds.minX, childBounds.minY] //vec.add([x1, y1], delta)
    shape.size = [childBounds.width, childBounds.height]

    return this
  },
})

const StyledGroupShape = styled('rect', {
  zDash: 5,
  zStrokeWidth: 1,
})

export default group
