import { Data, TransformEdge, TransformCorner } from "types"
import * as vec from "utils/vec"
import BaseSession from "./base-session"
import commands from "state/commands"
import { current } from "immer"
import { getShapeUtils } from "lib/shapes"
import {
  getTransformedBoundingBox,
  getCommonBounds,
  getRotatedCorners,
  getTransformAnchor,
} from "utils/utils"

export default class TransformSingleSession extends BaseSession {
  delta = [0, 0]
  isFlippedX = false
  isFlippedY = false
  transformType: TransformEdge | TransformCorner
  origin: number[]
  center: number[]
  snapshot: TransformSingleSnapshot
  corners: {
    a: number[]
    b: number[]
  }
  rotatedCorners: number[][]

  constructor(
    data: Data,
    transformType: TransformCorner | TransformEdge,
    point: number[]
  ) {
    super(data)
    this.origin = point
    this.transformType = transformType

    this.snapshot = getTransformSingleSnapshot(data, transformType)

    const { minX, minY, maxX, maxY } = this.snapshot.initialShapeBounds

    this.center = [(minX + maxX) / 2, (minY + maxY) / 2]

    this.corners = {
      a: [minX, minY],
      b: [maxX, maxY],
    }

    this.rotatedCorners = getRotatedCorners(
      this.snapshot.initialShapeBounds,
      this.snapshot.initialShape.rotation
    )
  }

  update(data: Data, point: number[]) {
    const {
      corners: { a, b },
      transformType,
    } = this

    const {
      boundsRotation,
      initialShapeBounds,
      currentPageId,
      initialShape,
      id,
    } = this.snapshot

    const { shapes } = data.document.pages[currentPageId]

    const shape = shapes[id]
    const rotation = shape.rotation

    // 1. Create a new bounding box.
    // Counter rotate the delta and apply this to the original bounding box.

    const delta = vec.vec(this.origin, point)

    /*
    Transforms
    
    Corners a and b are the original top-left and bottom-right corners of the
    bounding box. Depending on what the user is dragging, change one or both
    points. To keep things smooth, calculate based by adding the delta (the 
    vector between the current point and its original point) to the original
    bounding box values.
    */

    const newBoundingBox = getTransformedBoundingBox(
      initialShapeBounds,
      transformType,
      delta,
      shape.rotation
    )

    // console.log(newBoundingBox)

    switch (transformType) {
      case TransformEdge.Top: {
        a[1] = initialShapeBounds.minY + delta[1]
        break
      }
      case TransformEdge.Right: {
        b[0] = initialShapeBounds.maxX + delta[0]
        break
      }
      case TransformEdge.Bottom: {
        b[1] = initialShapeBounds.maxY + delta[1]
        break
      }
      case TransformEdge.Left: {
        a[0] = initialShapeBounds.minX + delta[0]
        break
      }
      case TransformCorner.TopLeft: {
        a[0] = initialShapeBounds.minX + delta[0]
        a[1] = initialShapeBounds.minY + delta[1]
        break
      }
      case TransformCorner.TopRight: {
        a[1] = initialShapeBounds.minY + delta[1]
        b[0] = initialShapeBounds.maxX + delta[0]
        break
      }
      case TransformCorner.BottomRight: {
        b[0] = initialShapeBounds.maxX + delta[0]
        b[1] = initialShapeBounds.maxY + delta[1]
        break
      }
      case TransformCorner.BottomLeft: {
        a[0] = initialShapeBounds.minX + delta[0]
        b[1] = initialShapeBounds.maxY + delta[1]
        break
      }
    }

    // Calculate new common (externior) bounding box
    const newBounds = {
      minX: Math.min(a[0], b[0]),
      minY: Math.min(a[1], b[1]),
      maxX: Math.max(a[0], b[0]),
      maxY: Math.max(a[1], b[1]),
      width: Math.abs(b[0] - a[0]),
      height: Math.abs(b[1] - a[1]),
    }

    this.isFlippedX = b[0] < a[0]
    this.isFlippedY = b[1] < a[1]

    const anchor = this.transformType

    // Pass the new data to the shape's transform utility for mutation.
    // Most shapes should be able to transform using only the bounding box,
    // however some shapes (e.g. those with internal points) will need more
    // data here too.

    getShapeUtils(shape).transformSingle(shape, newBoundingBox, {
      type: this.transformType,
      initialShape,
      initialShapeBounds,
      initialBounds: initialShapeBounds,
      boundsRotation,
      isFlippedX: this.isFlippedX,
      isFlippedY: this.isFlippedY,
      isSingle: true,
      anchor,
    })
  }

  cancel(data: Data) {
    const {
      id,
      boundsRotation,
      initialShape,
      initialShapeBounds,
      currentPageId,
      isSingle,
    } = this.snapshot

    const { shapes } = data.document.pages[currentPageId]

    // selectedIds.forEach((id) => {
    //   const shape = shapes[id]

    //   const { initialShape, initialShapeBounds } = shapeBounds[id]

    //   getShapeUtils(shape).transform(shape, initialShapeBounds, {
    //     type: this.transformType,
    //     initialShape,
    //     initialShapeBounds,
    //     initialBounds,
    //     boundsRotation,
    //     isFlippedX: false,
    //     isFlippedY: false,
    //     isSingle,
    //     anchor: getTransformAnchor(this.transformType, false, false),
    //   })
    // })
  }

  complete(data: Data) {
    commands.transformSingle(
      data,
      this.snapshot,
      getTransformSingleSnapshot(data, this.transformType),
      getTransformAnchor(this.transformType, false, false)
    )
  }
}

export function getTransformSingleSnapshot(
  data: Data,
  transformType: TransformEdge | TransformCorner
) {
  const {
    document: { pages },
    selectedIds,
    currentPageId,
  } = current(data)

  const pageShapes = pages[currentPageId].shapes

  const id = Array.from(selectedIds)[0]
  const shape = pageShapes[id]
  const bounds = getShapeUtils(shape).getBounds(shape)

  return {
    id,
    currentPageId,
    type: transformType,
    initialShape: shape,
    initialShapeBounds: {
      ...bounds,
      nx: 0,
      ny: 0,
      nmx: 1,
      nmy: 1,
      nw: 1,
      nh: 1,
    },
    boundsRotation: shape.rotation,
    isSingle: true,
  }
}

export type TransformSingleSnapshot = ReturnType<
  typeof getTransformSingleSnapshot
>
