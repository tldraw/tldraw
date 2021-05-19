import CodeShape from "./index"
import { v4 as uuid } from "uuid"
import { EllipseShape, ShapeType } from "types"
import { vectorToPoint } from "utils/utils"

export default class Ellipse extends CodeShape<EllipseShape> {
  constructor(props = {} as Partial<EllipseShape>) {
    props.point = vectorToPoint(props.point)

    super({
      id: uuid(),
      type: ShapeType.Ellipse,
      isGenerated: false,
      name: "Ellipse",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      radiusX: 20,
      radiusY: 20,
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

    return shape
  }

  get radiusX() {
    return this.shape.radiusX
  }

  get radiusY() {
    return this.shape.radiusY
  }
}
