import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { BaseLibShape, DotShape, ShapeType } from "types"

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
    const {
      point: [cx, cy],
    } = shape

    return {
      minX: cx,
      maxX: cx + 4,
      minY: cy,
      maxY: cy + 4,
      width: 4,
      height: 4,
    }
  },

  hitTest(shape, test) {
    return vec.dist(shape.point, test) < 4
  },

  rotate(shape) {
    return shape
  },

  translate(shape) {
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
