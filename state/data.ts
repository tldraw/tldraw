import { Data, ShapeType } from "types"
import Shapes from "lib/shapes"

export const defaultDocument: Data["document"] = {
  pages: {
    page0: {
      id: "page0",
      type: "page",
      name: "Page 0",
      childIndex: 0,
      shapes: {
        shape3: Shapes[ShapeType.Dot].create({
          id: "shape3",
          name: "Shape 3",
          childIndex: 3,
          point: [500, 100],
          style: {
            fill: "#aaa",
            stroke: "#777",
            strokeWidth: 1,
          },
        }),
        shape0: Shapes[ShapeType.Circle].create({
          id: "shape0",
          name: "Shape 0",
          childIndex: 1,
          point: [100, 100],
          radius: 50,
          style: {
            fill: "#aaa",
            stroke: "#777",
            strokeWidth: 1,
          },
        }),
        shape2: Shapes[ShapeType.Polyline].create({
          id: "shape2",
          name: "Shape 2",
          childIndex: 2,
          point: [200, 600],
          points: [
            [0, 0],
            [75, 200],
            [100, 50],
          ],
          style: {
            fill: "none",
            stroke: "#777",
            strokeWidth: 2,
          },
        }),
        shape1: Shapes[ShapeType.Rectangle].create({
          id: "shape1",
          name: "Shape 1",
          childIndex: 1,
          point: [300, 300],
          size: [200, 200],
          style: {
            fill: "#aaa",
            stroke: "#777",
            strokeWidth: 1,
          },
        }),
      },
    },
  },
}
