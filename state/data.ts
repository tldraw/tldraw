import { Data, ShapeType } from "types"
import shapeUtils from "lib/shape-utils"

export const defaultDocument: Data["document"] = {
  pages: {
    page0: {
      id: "page0",
      type: "page",
      name: "Page 0",
      childIndex: 0,
      shapes: {
        rayShape: shapeUtils[ShapeType.Ray].create({
          id: "rayShape",
          name: "Ray",
          childIndex: 3,
          point: [300, 300],
          direction: [0.5, 0.5],
        }),
        // shape3: shapeUtils[ShapeType.Dot].create({
        //   id: "shape3",
        //   name: "Shape 3",
        //   childIndex: 3,
        //   point: [400, 500],
        //   style: {
        //     fill: "#AAA",
        //     stroke: "#c6cacb",
        //     strokeWidth: 1,
        //   },
        // }),
        shape0: shapeUtils[ShapeType.Circle].create({
          id: "shape0",
          name: "Shape 0",
          childIndex: 1,
          point: [100, 600],
          radius: 50,
        }),
        shape5: shapeUtils[ShapeType.Ellipse].create({
          id: "shape5",
          name: "Shape 5",
          childIndex: 5,
          point: [400, 600],
          radiusX: 50,
          radiusY: 30,
        }),
        // shape7: shapeUtils[ShapeType.Ellipse].create({
        //   id: "shape7",
        //   name: "Shape 7",
        //   childIndex: 7,
        //   point: [100, 100],
        //   radiusX: 50,
        //   radiusY: 30,
        //   style: {
        //     fill: "#AAA",
        //     stroke: "#c6cacb",
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
        //     stroke: "#c6cacb",
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
        //     stroke: "#c6cacb",
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
        //     stroke: "#c6cacb",
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
  point: new Vector(0, 0),
})

new Circle({
  point: new Vector(200, 0),
  radius: 50,
})

new Ellipse({
  point: new Vector(400, 0),
  radiusX: 50,
  radiusY: 75
})

new Rectangle({
  point: new Vector(0, 300),
})

new Line({
  point: new Vector(200, 300),
  direction: new Vector(1,0.2)
})

new Polyline({
  point: new Vector(400, 300),
  points: [new Vector(0, 200), new Vector(0,0), new Vector(200, 200), new Vector(200, 0)],
})
`,
    },
  },
}

export const colors = {
  transparent: "transparent",
  white: "rgba(248, 249, 250, 1.000)",
  lightGray: "rgba(224, 226, 230, 1.000)",
  gray: "rgba(172, 181, 189, 1.000)",
  darkGray: "rgba(52, 58, 64, 1.000)",
  black: "rgba(0,0,0, 1.000)",
  lime: "rgba(115, 184, 23, 1.000)",
  green: "rgba(54, 178, 77, 1.000)",
  teal: "rgba(9, 167, 120, 1.000)",
  cyan: "rgba(14, 152, 173, 1.000)",
  blue: "rgba(28, 126, 214, 1.000)",
  indigo: "rgba(66, 99, 235, 1.000)",
  violet: "rgba(112, 72, 232, 1.000)",
  grape: "rgba(174, 62, 200, 1.000)",
  pink: "rgba(214, 51, 108, 1.000)",
  red: "rgba(240, 63, 63, 1.000)",
  orange: "rgba(247, 103, 6, 1.000)",
  yellow: "rgba(245, 159, 0, 1.000)",
}
