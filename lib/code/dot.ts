import CodeShape from "./index"
import { v4 as uuid } from "uuid"
import { DotShape, ShapeType } from "types"

export default class Dot extends CodeShape<DotShape> {
  constructor(props = {} as Partial<DotShape>) {
    super({
      id: uuid(),
      type: ShapeType.Dot,
      isGenerated: false,
      name: "Dot",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
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
