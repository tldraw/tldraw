import CodeShape from "./index"
import { v4 as uuid } from "uuid"
import { RayShape, ShapeType } from "types"

export default class Ray extends CodeShape<RayShape> {
  constructor(props = {} as Partial<RayShape>) {
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
        fill: "#777",
        stroke: "#000",
        strokeWidth: 1,
      },
      ...props,
    })
  }
}
