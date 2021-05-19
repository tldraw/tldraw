import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import {
  RectangleShape,
  ShapeType,
  TransformCorner,
  TransformEdge,
} from "types"
import { createShape } from "./index"
import { boundsCollidePolygon, boundsContainPolygon } from "utils/bounds"
import {
  getBoundsFromPoints,
  getRotatedCorners,
  rotateBounds,
  translateBounds,
} from "utils/utils"

const rectangle = createShape<RectangleShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Rectangle,
      isGenerated: false,
      name: "Rectangle",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      size: [1, 1],
      rotation: 0,
      style: {
        fill: "#c6cacb",
        stroke: "#000",
      },
      ...props,
    }
  },

  render({ id, size }) {
    return <rect id={id} width={size[0]} height={size[1]} />
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const [width, height] = shape.size
      const bounds = {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      }

      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    return getBoundsFromPoints(
      getRotatedCorners(this.getBounds(shape), shape.rotation)
    )
  },

  getCenter(shape) {
    const bounds = this.getRotatedBounds(shape)
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  },

  hitTest(shape) {
    return true
  },

  hitTestBounds(shape, brushBounds) {
    const rotatedCorners = getRotatedCorners(
      this.getBounds(shape),
      shape.rotation
    )

    return (
      boundsContainPolygon(brushBounds, rotatedCorners) ||
      boundsCollidePolygon(brushBounds, rotatedCorners)
    )
  },

  rotate(shape) {
    return shape
  },

  translate(shape, delta) {
    shape.point = vec.add(shape.point, delta)
    return shape
  },

  scale(shape, scale) {
    return shape
  },

  transform(
    shape,
    shapeBounds,
    { initialShape, isSingle, initialShapeBounds, isFlippedX, isFlippedY }
  ) {
    if (shape.rotation === 0 || isSingle) {
      shape.size = [shapeBounds.width, shapeBounds.height]
      shape.point = [shapeBounds.minX, shapeBounds.minY]
    } else {
      shape.size = vec.mul(
        initialShape.size,
        Math.min(
          shapeBounds.width / initialShapeBounds.width,
          shapeBounds.height / initialShapeBounds.height
        )
      )

      const newCenter = [
        shapeBounds.minX + shapeBounds.width / 2,
        shapeBounds.minY + shapeBounds.height / 2,
      ]

      shape.point = vec.sub(newCenter, vec.div(shape.size, 2))
    }

    // Rotation for flipped shapes

    shape.rotation = initialShape.rotation

    if (isFlippedX) {
      shape.rotation *= -1
    }

    if (isFlippedY) {
      shape.rotation *= -1
    }

    return shape
  },

  transformSingle(
    shape,
    bounds,
    { initialShape, initialShapeBounds, anchor, isFlippedY, isFlippedX }
  ) {
    shape.size = [bounds.width, bounds.height]
    shape.point = [bounds.minX, bounds.minY]

    // const prevCorners = getRotatedCorners(
    //   initialShapeBounds,
    //   initialShape.rotation
    // )

    // let currCorners = getRotatedCorners(this.getBounds(shape), shape.rotation)

    // if (isFlippedX) {
    //   let t = currCorners[3]
    //   currCorners[3] = currCorners[2]
    //   currCorners[2] = t

    //   t = currCorners[0]
    //   currCorners[0] = currCorners[1]
    //   currCorners[1] = t
    // }

    // if (isFlippedY) {
    //   let t = currCorners[3]
    //   currCorners[3] = currCorners[0]
    //   currCorners[0] = t

    //   t = currCorners[2]
    //   currCorners[2] = currCorners[1]
    //   currCorners[1] = t
    // }

    // switch (anchor) {
    //   case TransformCorner.TopLeft: {
    //     shape.point = vec.sub(
    //       shape.point,
    //       vec.sub(currCorners[2], prevCorners[2])
    //     )
    //     break
    //   }
    //   case TransformCorner.TopRight: {
    //     shape.point = vec.sub(
    //       shape.point,
    //       vec.sub(currCorners[3], prevCorners[3])
    //     )
    //     break
    //   }
    //   case TransformCorner.BottomRight: {
    //     shape.point = vec.sub(
    //       shape.point,
    //       vec.sub(currCorners[0], prevCorners[0])
    //     )
    //     break
    //   }
    //   case TransformCorner.BottomLeft: {
    //     shape.point = vec.sub(
    //       shape.point,
    //       vec.sub(currCorners[1], prevCorners[1])
    //     )
    //     break
    //   }
    //   case TransformEdge.Top: {
    //     shape.point = vec.sub(
    //       shape.point,
    //       vec.sub(currCorners[3], prevCorners[3])
    //     )
    //     break
    //   }
    //   case TransformEdge.Right: {
    //     shape.point = vec.sub(
    //       shape.point,
    //       vec.sub(currCorners[3], prevCorners[3])
    //     )
    //     break
    //   }
    //   case TransformEdge.Bottom: {
    //     shape.point = vec.sub(
    //       shape.point,
    //       vec.sub(currCorners[0], prevCorners[0])
    //     )
    //     break
    //   }
    //   case TransformEdge.Left: {
    //     shape.point = vec.sub(
    //       shape.point,
    //       vec.sub(currCorners[2], prevCorners[2])
    //     )
    //     break
    //   }
    // }

    // console.log(shape.point, shape.size)

    return shape
  },

  canTransform: true,
})

export default rectangle
