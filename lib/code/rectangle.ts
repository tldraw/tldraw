import CodeShape from "./index"
import { v4 as uuid } from "uuid"
import { RectangleShape, ShapeType } from "types"

export default class Rectangle extends CodeShape<RectangleShape> {
  constructor(props = {} as Partial<RectangleShape>) {
    super({
      id: uuid(),
      type: ShapeType.Rectangle,
      name: "Rectangle",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      size: [1, 1],
      rotation: 0,
      style: {},
      ...props,
    })
  }

  get size() {
    return this.shape.size
  }
}
