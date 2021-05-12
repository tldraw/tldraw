import Circle from "./circle"
import Dot from "./dot"
import Polyline from "./polyline"
import Rectangle from "./rectangle"

import { Bounds, Shape, ShapeType } from "types"

export const boundsCache = new WeakMap<Shape, Bounds>([])

const shapes = {
  [ShapeType.Circle]: Circle,
  [ShapeType.Dot]: Dot,
  [ShapeType.Polyline]: Polyline,
  [ShapeType.Rectangle]: Rectangle,
}

export default shapes
