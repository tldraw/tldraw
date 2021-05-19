import CodeShape from "./index"
import { v4 as uuid } from "uuid"
import { RayShape, ShapeType } from "types"
import { vectorToPoint } from "utils/utils"

export default class Ray extends CodeShape<RayShape> {
  constructor(props = {} as Partial<RayShape>) {
    props.point = vectorToPoint(props.point)
    props.direction = vectorToPoint(props.direction)

    super({
      id: uuid(),
      type: ShapeType.Ray,
      isGenerated: false,
      name: "Ray",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      direction: [0, 1],
      rotation: 0,
      style: {
        fill: "#c6cacb",
        stroke: "#000",
        strokeWidth: 1,
      },
      ...props,
    })
  }

  export() {
    const shape = { ...this.shape }

    shape.point = vectorToPoint(shape.point)
    shape.direction = vectorToPoint(shape.direction)

    return shape
  }

  get direction() {
    return this.shape.direction
  }
}
