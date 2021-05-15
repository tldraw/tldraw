import CodeShape from "./index"
import { v4 as uuid } from "uuid"
import { RectangleShape, ShapeType } from "types"

export default class Rectangle extends CodeShape<RectangleShape> {
  constructor(props = {} as Partial<RectangleShape>) {
    super({
      id: uuid(),
      type: ShapeType.Rectangle,
      isGenerated: true,
      name: "Rectangle",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      size: [100, 100],
      rotation: 0,
      style: {
        fill: "#777",
        stroke: "#000",
        strokeWidth: 1,
      },
      ...props,
    })
  }

  get size() {
    return this.shape.size
  }
}
