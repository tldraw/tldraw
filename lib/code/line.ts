import CodeShape from "./index"
import { v4 as uuid } from "uuid"
import { LineShape, ShapeType } from "types"

export default class Line extends CodeShape<LineShape> {
  constructor(props = {} as Partial<LineShape>) {
    super({
      id: uuid(),
      type: ShapeType.Line,
      isGenerated: false,
      name: "Line",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      direction: [0, 0],
      rotation: 0,
      style: {
        fill: "#777",
        stroke: "#000",
        strokeWidth: 1,
      },
      ...props,
    })
  }
}
