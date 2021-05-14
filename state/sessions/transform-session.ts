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
import { getCommonBounds } from "utils/utils"

export default class TransformSession extends BaseSession {
  delta = [0, 0]
  transformType: TransformEdge | TransformCorner
  origin: number[]
  snapshot: TransformSnapshot
  corners: {
    a: number[]
    b: number[]
  }

  constructor(
    data: Data,
    type: TransformCorner | TransformEdge,
    point: number[]
  ) {
    super(data)
    this.origin = point
    this.transformType = type
    this.snapshot = getTransformSnapshot(data)

    const { minX, minY, maxX, maxY } = this.snapshot.initialBounds

    this.corners = {
      a: [minX, minY],
      b: [maxX, maxY],
    }
  }

  update(data: Data, point: number[]) {
    const {
      shapeBounds,
      initialBounds,
      currentPageId,
      selectedIds,
    } = this.snapshot

    const { shapes } = data.document.pages[currentPageId]

    let [x, y] = point

    const {
      corners: { a, b },
      transformType,
    } = this

    // Edge Transform

    switch (transformType) {
      case TransformEdge.Top: {
        a[1] = y
        break
      }
      case TransformEdge.Right: {
        b[0] = x
        break
      }
      case TransformEdge.Bottom: {
        b[1] = y
        break
      }
      case TransformEdge.Left: {
        a[0] = x
        break
      }
      case TransformCorner.TopLeft: {
        a[1] = y
        a[0] = x
        break
      }
      case TransformCorner.TopRight: {
        b[0] = x
        a[1] = y
        break
      }
      case TransformCorner.BottomRight: {
        b[1] = y
        b[0] = x
        break
      }
      case TransformCorner.BottomLeft: {
        a[0] = x
        b[1] = y
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

    const isFlippedX = b[0] < a[0]
    const isFlippedY = b[1] < a[1]

    // Now work backward to calculate a new bounding box for each of the shapes.

    selectedIds.forEach((id) => {
      const { initialShape, initialShapeBounds } = shapeBounds[id]
      const { nx, nmx, nw, ny, nmy, nh } = initialShapeBounds
      const shape = shapes[id]

      const minX = newBounds.minX + (isFlippedX ? nmx : nx) * newBounds.width
      const minY = newBounds.minY + (isFlippedY ? nmy : ny) * newBounds.height
      const width = nw * newBounds.width
      const height = nh * newBounds.height

      const newShapeBounds = {
        minX,
        minY,
        maxX: minX + width,
        maxY: minY + height,
        width,
        height,
        isFlippedX,
        isFlippedY,
      }

      // Pass the new data to the shape's transform utility for mutation.
      // Most shapes should be able to transform using only the bounding box,
      // however some shapes (e.g. those with internal points) will need more
      // data here too.

      getShapeUtils(shape).transform(
        shape,
        newShapeBounds,
        initialShape,
        initialShapeBounds,
        initialBounds
      )
    })
  }

  cancel(data: Data) {
    const {
      shapeBounds,
      initialBounds,
      currentPageId,
      selectedIds,
    } = this.snapshot

    const { shapes } = data.document.pages[currentPageId]

    selectedIds.forEach((id) => {
      const shape = shapes.shapes[id]
      const { initialShape, initialShapeBounds } = shapeBounds[id]

      getShapeUtils(shape).transform(
        shape,
        {
          ...initialShapeBounds,
          isFlippedX: false,
          isFlippedY: false,
        },
        initialShape,
        initialShapeBounds,
        initialBounds
      )
    })
  }

  complete(data: Data) {
    commands.transform(data, this.snapshot, getTransformSnapshot(data))
  }
}

export function getTransformSnapshot(data: Data) {
  const {
    document: { pages },
    selectedIds,
    currentPageId,
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
    initialBounds: bounds,
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
