import { Data, ShapeType } from "types"
import shapeUtils from "lib/shapes"

export const defaultDocument: Data["document"] = {
  pages: {
    page0: {
      id: "page0",
      type: "page",
      name: "Page 0",
      childIndex: 0,
      shapes: {
        // shape3: shapeUtils[ShapeType.Dot].create({
        //   id: "shape3",
        //   name: "Shape 3",
        //   childIndex: 3,
        //   point: [400, 500],
        //   style: {
        //     fill: "#AAA",
        //     stroke: "#777",
        //     strokeWidth: 1,
        //   },
        // }),
        // shape0: shapeUtils[ShapeType.Circle].create({
        //   id: "shape0",
        //   name: "Shape 0",
        //   childIndex: 1,
        //   point: [100, 600],
        //   radius: 50,
        //   style: {
        //     fill: "#AAA",
        //     stroke: "#777",
        //     strokeWidth: 1,
        //   },
        // }),
        // shape5: shapeUtils[ShapeType.Ellipse].create({
        //   id: "shape5",
        //   name: "Shape 5",
        //   childIndex: 5,
        //   point: [400, 600],
        //   radiusX: 50,
        //   radiusY: 30,
        //   style: {
        //     fill: "#AAA",
        //     stroke: "#777",
        //     strokeWidth: 1,
        //   },
        // }),
        // shape7: shapeUtils[ShapeType.Ellipse].create({
        //   id: "shape7",
        //   name: "Shape 7",
        //   childIndex: 7,
        //   point: [100, 100],
        //   radiusX: 50,
        //   radiusY: 30,
        //   style: {
        //     fill: "#AAA",
        //     stroke: "#777",
        //     strokeWidth: 1,
        //   },
        // }),
        // shape2: shapeUtils[ShapeType.Polyline].create({
        //   id: "shape2",
        //   name: "Shape 2",
        //   childIndex: 2,
        //   point: [200, 600],
        //   points: [
        //     [0, 0],
        //     [75, 200],
        //     [100, 50],
        //   ],
        //   style: {
        //     fill: "none",
        //     stroke: "#777",
        //     strokeWidth: 2,
        //     strokeLinecap: "round",
        //     strokeLinejoin: "round",
        //   },
        // }),
        // shape1: shapeUtils[ShapeType.Rectangle].create({
        //   id: "shape1",
        //   name: "Shape 1",
        //   childIndex: 1,
        //   point: [400, 600],
        //   size: [200, 200],
        //   style: {
        //     fill: "#AAA",
        //     stroke: "#777",
        //     strokeWidth: 1,
        //   },
        // }),
        // shape6: shapeUtils[ShapeType.Line].create({
        //   id: "shape6",
        //   name: "Shape 6",
        //   childIndex: 1,
        //   point: [400, 400],
        //   direction: [0.2, 0.2],
        //   style: {
        //     fill: "#AAA",
        //     stroke: "#777",
        //     strokeWidth: 1,
        //   },
        // }),
      },
    },
  },
  code: {
    file0: {
      id: "file0",
      name: "index.ts",
      code: `
new Dot({
  point: [0, 0],
})

new Circle({
  point: [200, 0],
  radius: 50,
})

new Ellipse({
  point: [400, 0],
  radiusX: 50,
  radiusY: 75
})

new Rectangle({
  point: [0, 300],
})

new Line({
  point: [200, 300],
  direction: [1,0.2]
})

new Polyline({
  point: [400, 300],
  points: [[0, 200], [0,0], [200, 200], [200, 0]],
})
`,
    },
  },
}
