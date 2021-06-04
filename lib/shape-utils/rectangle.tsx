import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import { RectangleShape, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import { translateBounds } from 'utils/utils'
import { defaultStyle, getShapeStyle } from 'lib/shape-styles'

const rectangle = registerShapeUtils<RectangleShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Rectangle,
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
      ...props,
    }
  },

  render({ id, size, radius, style }) {
    const styles = getShapeStyle(style)
    return (
      <g id={id}>
        <rect
          id={id}
          rx={radius}
          ry={radius}
          x={+styles.strokeWidth / 2}
          y={+styles.strokeWidth / 2}
          width={Math.max(0, size[0] + -styles.strokeWidth)}
          height={Math.max(0, size[1] + -styles.strokeWidth)}
        />
      </g>
    )
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
    return true
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
})

export default rectangle
