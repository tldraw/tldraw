import { Data, ShapeType } from 'types'
import shapeUtils from 'lib/shape-utils'

export const defaultDocument: Data['document'] = {
  pages: {
    page0: {
      id: 'page0',
      type: 'page',
      name: 'Page 0',
      childIndex: 0,
      shapes: {
        // arrowShape0: shapeUtils[ShapeType.Arrow].create({
        //   id: 'arrowShape0',
        //   point: [200, 200],
        //   points: [
        //     [0, 0],
        //     [200, 200],
        //   ],
        // }),
        // arrowShape1: shapeUtils[ShapeType.Arrow].create({
        //   id: 'arrowShape1',
        //   point: [100, 100],
        //   points: [
        //     [0, 0],
        //     [300, 0],
        //   ],
        // }),
        // shape3: shapeUtils[ShapeType.Dot].create({
        //   id: 'shape3',
        //   name: 'Shape 3',
        //   childIndex: 3,
        //   point: [400, 500],
        //   style: {
        //     stroke: shades.black,
        //     fill: shades.lightGray,
        //     strokeWidth: 1,
        //   },
        // }),
        // shape0: shapeUtils[ShapeType.Circle].create({
        //   id: 'shape0',
        //   name: 'Shape 0',
        //   childIndex: 1,
        //   point: [100, 600],
        //   radius: 50,
        //   style: {
        //     stroke: shades.black,
        //     fill: shades.lightGray,
        //     strokeWidth: 1,
        //   },
        // }),
        // shape5: shapeUtils[ShapeType.Ellipse].create({
        //   id: 'shape5',
        //   name: 'Shape 5',
        //   childIndex: 5,
        //   point: [200, 200],
        //   radiusX: 50,
        //   radiusY: 100,
        //   style: {
        //     stroke: shades.black,
        //     fill: shades.lightGray,
        //     strokeWidth: 1,
        //   },
        // }),
        // shape7: shapeUtils[ShapeType.Ellipse].create({
        //   id: 'shape7',
        //   name: 'Shape 7',
        //   childIndex: 7,
        //   point: [100, 100],
        //   radiusX: 50,
        //   radiusY: 30,
        //   style: {
        //     stroke: shades.black,
        //     fill: shades.lightGray,
        //     strokeWidth: 1,
        //   },
        // }),
        // shape6: shapeUtils[ShapeType.Line].create({
        //   id: 'shape6',
        //   name: 'Shape 6',
        //   childIndex: 1,
        //   point: [400, 400],
        //   direction: [0.2, 0.2],
        //   style: {
        //     stroke: shades.black,
        //     fill: shades.lightGray,
        //     strokeWidth: 1,
        //   },
        // }),
        // rayShape: shapeUtils[ShapeType.Ray].create({
        //   id: 'rayShape',
        //   name: 'Ray',
        //   childIndex: 3,
        //   point: [300, 100],
        //   direction: [0.5, 0.5],
        //   style: {
        //     stroke: shades.black,
        //     fill: shades.lightGray,
        //     strokeWidth: 1,
        //   },
        // }),
        // shape2: shapeUtils[ShapeType.Polyline].create({
        //   id: 'shape2',
        //   name: 'Shape 2',
        //   childIndex: 2,
        //   point: [200, 600],
        //   points: [
        //     [0, 0],
        //     [75, 200],
        //     [100, 50],
        //   ],
        //   style: {
        //     stroke: shades.black,
        //     fill: shades.none,
        //     strokeWidth: 1,
        //   },
        // }),
        // shape1: shapeUtils[ShapeType.Rectangle].create({
        //   id: 'shape1',
        //   name: 'Shape 1',
        //   childIndex: 1,
        //   point: [400, 600],
        //   size: [200, 200],
        //   style: {
        //     stroke: shades.black,
        //     fill: shades.lightGray,
        //     strokeWidth: 1,
        //   },
        // }),
      },
    },
    page1: {
      id: 'page1',
      type: 'page',
      name: 'Page 1',
      childIndex: 1,
      shapes: {},
    },
  },
  code: {
    file0: {
      id: 'file0',
      name: 'index.ts',
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
