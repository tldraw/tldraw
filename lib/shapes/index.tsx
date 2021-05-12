import Circle from "./circle"
import Dot from "./dot"
import Polyline from "./polyline"
import Rectangle from "./rectangle"

import { ShapeType } from "types"

export default {
  [ShapeType.Circle]: Circle,
  [ShapeType.Dot]: Dot,
  [ShapeType.Polyline]: Polyline,
  [ShapeType.Rectangle]: Rectangle,
}
