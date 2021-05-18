import {
  Data,
  TransformEdge,
  TransformCorner,
  Bounds,
  BoundsSnapshot,
} from "types"
import * as vec from "utils/vec"
import BaseSession from "./base-session"
import commands from "state/commands"
import { current } from "immer"
import { getShapeUtils } from "lib/shapes"
import { getCommonBounds, getTransformAnchor } from "utils/utils"

export default class TransformSession extends BaseSession {
  delta = [0, 0]
  isFlippedX = false
  isFlippedY = false
  transformType: TransformEdge | TransformCorner
  origin: number[]
  snapshot: TransformSnapshot
  corners: {
    a: number[]
    b: number[]
  }

  constructor(
    data: Data,
    transformType: TransformCorner | TransformEdge,
    point: number[]
  ) {
    super(data)
    this.origin = point
    this.transformType = transformType

    // if (data.selectedIds.size === 1) {
    //   const shape =
    //     data.document.pages[data.currentPageId].shapes[
    //       Array.from(data.selectedIds.values())[0]
    //     ]

    //   if (shape.rotation > 0) {

    //   }
    // }

    this.snapshot = getTransformSnapshot(data, transformType)

    const { minX, minY, maxX, maxY } = this.snapshot.initialBounds

    this.corners = {
      a: [minX, minY],
      b: [maxX, maxY],
    }
  }

  update(data: Data, point: number[]) {
    const {
      corners: { a, b },
      transformType,
    } = this

    const {
      boundsRotation,
      shapeBounds,
      initialBounds,
      currentPageId,
      selectedIds,
      isSingle,
    } = this.snapshot

    const { shapes } = data.document.pages[currentPageId]

    const delta = vec.vec(this.origin, point)

    /*
    Transforms
    
    Corners a and b are the original top-left and bottom-right corners of the
    bounding box. Depending on what the user is dragging, change one or both
    points. To keep things smooth, calculate based by adding the delta (the 
    vector between the current point and its original point) to the original
    bounding box values.
    */

    switch (transformType) {
      case TransformEdge.Top: {
        a[1] = initialBounds.minY + delta[1]
        break
      }
      case TransformEdge.Right: {
        b[0] = initialBounds.maxX + delta[0]
        break
      }
      case TransformEdge.Bottom: {
        b[1] = initialBounds.maxY + delta[1]
        break
      }
      case TransformEdge.Left: {
        a[0] = initialBounds.minX + delta[0]
        break
      }
      case TransformCorner.TopLeft: {
        a[0] = initialBounds.minX + delta[0]
        a[1] = initialBounds.minY + delta[1]
        break
      }
      case TransformCorner.TopRight: {
        a[1] = initialBounds.minY + delta[1]
        b[0] = initialBounds.maxX + delta[0]
        break
      }
      case TransformCorner.BottomRight: {
        b[0] = initialBounds.maxX + delta[0]
        b[1] = initialBounds.maxY + delta[1]
        break
      }
      case TransformCorner.BottomLeft: {
        a[0] = initialBounds.minX + delta[0]
        b[1] = initialBounds.maxY + delta[1]
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

    // Now work backward to calculate a new bounding box for each of the shapes.

    selectedIds.forEach((id) => {
      const { initialShape, initialShapeBounds } = shapeBounds[id]
      const { nx, nmx, nw, ny, nmy, nh } = initialShapeBounds
      const shape = shapes[id]

      const minX =
        newBounds.minX + (this.isFlippedX ? nmx : nx) * newBounds.width
      const minY =
        newBounds.minY + (this.isFlippedY ? nmy : ny) * newBounds.height
      const width = nw * newBounds.width
      const height = nh * newBounds.height

      const newShapeBounds = {
        minX,
        minY,
        maxX: minX + width,
        maxY: minY + height,
        width,
        height,
        isFlippedX: this.isFlippedX,
        isFlippedY: this.isFlippedY,
      }

      // Pass the new data to the shape's transform utility for mutation.
      // Most shapes should be able to transform using only the bounding box,
      // however some shapes (e.g. those with internal points) will need more
      // data here too.

      getShapeUtils(shape).transform(shape, newShapeBounds, {
        type: this.transformType,
        initialShape,
        initialShapeBounds,
        initialBounds,
        boundsRotation,
        isFlippedX: this.isFlippedX,
        isFlippedY: this.isFlippedY,
        isSingle,
        anchor: getTransformAnchor(
          this.transformType,
          this.isFlippedX,
          this.isFlippedY
        ),
      })
    })
  }

  cancel(data: Data) {
    const {
      shapeBounds,
      boundsRotation,
      initialBounds,
      currentPageId,
      selectedIds,
      isSingle,
    } = this.snapshot

    const { shapes } = data.document.pages[currentPageId]

    selectedIds.forEach((id) => {
      const shape = shapes[id]

      const { initialShape, initialShapeBounds } = shapeBounds[id]

      getShapeUtils(shape).transform(shape, initialShapeBounds, {
        type: this.transformType,
        initialShape,
        initialShapeBounds,
        initialBounds,
        boundsRotation,
        isFlippedX: false,
        isFlippedY: false,
        isSingle,
        anchor: getTransformAnchor(this.transformType, false, false),
      })
    })
  }

  complete(data: Data) {
    commands.transform(
      data,
      this.snapshot,
      getTransformSnapshot(data, this.transformType),
      getTransformAnchor(this.transformType, false, false)
    )
  }
}

export function getTransformSnapshot(
  data: Data,
  transformType: TransformEdge | TransformCorner
) {
  const {
    document: { pages },
    selectedIds,
    currentPageId,
    boundsRotation,
  } = current(data)

  const pageShapes = pages[currentPageId].shapes

  // A mapping of selected shapes and their bounds
  const shapesBounds = Object.fromEntries(
    Array.from(selectedIds.values()).map((id) => {
      const shape = pageShapes[id]
      return [shape.id, getShapeUtils(shape).getBounds(shape)]
    })
  )

  // The common (exterior) bounds of the selected shapes
  const bounds = getCommonBounds(...Object.values(shapesBounds))

  // Return a mapping of shapes to bounds together with the relative
  // positions of the shape's bounds within the common bounds shape.
  return {
    currentPageId,
    type: transformType,
    initialBounds: bounds,
    boundsRotation,
    isSingle: selectedIds.size === 1,
    selectedIds: new Set(selectedIds),
    shapeBounds: Object.fromEntries(
      Array.from(selectedIds.values()).map((id) => {
        const { minX, minY, width, height } = shapesBounds[id]
        return [
          id,
          {
            initialShape: pageShapes[id],
            initialShapeBounds: {
              ...shapesBounds[id],
              nx: (minX - bounds.minX) / bounds.width,
              ny: (minY - bounds.minY) / bounds.height,
              nmx: 1 - (minX + width - bounds.minX) / bounds.width,
              nmy: 1 - (minY + height - bounds.minY) / bounds.height,
              nw: width / bounds.width,
              nh: height / bounds.height,
            },
          },
        ]
      })
    ),
  }
}

export type TransformSnapshot = ReturnType<typeof getTransformSnapshot>
