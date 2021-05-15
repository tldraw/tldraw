import CodeShape from "./index"
import { v4 as uuid } from "uuid"
import { PolylineShape, ShapeType } from "types"

export default class Polyline extends CodeShape<PolylineShape> {
  constructor(props = {} as Partial<PolylineShape>) {
    super({
      id: uuid(),
      type: ShapeType.Polyline,
      isGenerated: false,
      name: "Polyline",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      points: [[0, 0]],
      rotation: 0,
      style: {
        fill: "none",
        stroke: "#000",
        strokeWidth: 1,
      },
      ...props,
    })
  }
}
