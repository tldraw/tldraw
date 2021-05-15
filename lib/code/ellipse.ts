import CodeShape from "./index"
import { v4 as uuid } from "uuid"
import { EllipseShape, ShapeType } from "types"

export default class Ellipse extends CodeShape<EllipseShape> {
  constructor(props = {} as Partial<EllipseShape>) {
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
        fill: "#777",
        stroke: "#000",
        strokeWidth: 1,
      },
      ...props,
    })
  }

  get radius() {
    return this.shape.radius
  }
}
