import { uniqueId } from 'utils'
import vec from 'utils/vec'
import { RayShape, ShapeType } from 'types'
import { intersectCircleBounds } from 'utils/intersections'
import { ThinLine } from 'components/canvas/misc'
import { translateBounds, boundsContained } from 'utils'
import { defaultStyle } from 'state/shape-styles'
import { registerShapeUtils } from './register'

const ray = registerShapeUtils<RayShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uniqueId(),

      type: ShapeType.Ray,
      isGenerated: false,
      name: 'Ray',
      parentId: 'page1',
      childIndex: 0,
      point: [0, 0],
      direction: [0, 1],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: false,
      },
    }
  },

  render({ id, direction }) {
    const [x2, y2] = vec.add([0, 0], vec.mul(direction, 10000))

    return (
      <g id={id}>
        <ThinLine x1={0} y1={0} x2={x2} y2={y2} />
        <use href="#dot" />
      </g>
    )
  },

  getRotatedBounds(shape) {
    return this.getBounds(shape)
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const bounds = {
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
        width: 1,
        height: 1,
      }

      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getCenter(shape) {
    return shape.point
  },

  hitTest() {
    return true
  },

  hitTestBounds(this, shape, brushBounds) {
    const shapeBounds = this.getBounds(shape)
    return (
      boundsContained(shapeBounds, brushBounds) ||
      intersectCircleBounds(shape.point, 4, brushBounds).length > 0
    )
  },

  transform(shape, bounds) {
    shape.point = [bounds.minX, bounds.minY]

    return this
  },

  transformSingle(shape, bounds, info) {
    return this.transform(shape, bounds, info)
  },

  canTransform: false,
  canChangeAspectRatio: false,
  canStyleFill: false,
})

export default ray
