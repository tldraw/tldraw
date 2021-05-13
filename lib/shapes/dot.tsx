import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { BaseLibShape, DotShape, ShapeType } from "types"
import { boundsCache } from "./index"

const Dot: BaseLibShape<ShapeType.Dot> = {
  create(props): DotShape {
    return {
      id: uuid(),
      type: ShapeType.Dot,
      name: "Dot",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      style: {},
      ...props,
    }
  },

  render({ id }) {
    return <circle id={id} cx={4} cy={4} r={4} />
  },

  getBounds(shape) {
    if (boundsCache.has(shape)) {
      return boundsCache.get(shape)
    }

    const {
      point: [x, y],
    } = shape

    const bounds = {
      minX: x,
      maxX: x + 8,
      minY: y,
      maxY: y + 8,
      width: 8,
      height: 8,
    }

    boundsCache.set(shape, bounds)
    return bounds
  },

  hitTest(shape, test) {
    return vec.dist(shape.point, test) < 4
  },

  rotate(shape) {
    return shape
  },

  translate(shape, delta) {
    shape.point = vec.add(shape.point, delta)
    return shape
  },

  scale(shape, scale: number) {
    return shape
  },

  stretch(shape, scaleX: number, scaleY: number) {
    return shape
  },
}

export default Dot
