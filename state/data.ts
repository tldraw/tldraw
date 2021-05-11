import { Data, ShapeType } from "types"

export const defaultDocument: Data["document"] = {
  pages: {
    page0: {
      id: "page0",
      type: "page",
      name: "Page 0",
      childIndex: 0,
      shapes: {
        shape0: {
          id: "shape0",
          type: ShapeType.Circle,
          name: "Shape 0",
          parentId: "page0",
          childIndex: 1,
          point: [100, 100],
          radius: 50,
          rotation: 0,
        },
        shape1: {
          id: "shape1",
          type: ShapeType.Rectangle,
          name: "Shape 1",
          parentId: "page0",
          childIndex: 1,
          point: [300, 300],
          size: [200, 200],
          rotation: 0,
        },
        shape2: {
          id: "shape2",
          type: ShapeType.Circle,
          name: "Shape 2",
          parentId: "page0",
          childIndex: 2,
          point: [200, 800],
          radius: 25,
          rotation: 0,
        },
        shape3: {
          id: "shape3",
          type: ShapeType.Dot,
          name: "Shape 3",
          parentId: "page0",
          childIndex: 3,
          point: [500, 100],
          rotation: 0,
        },
      },
    },
  },
}
