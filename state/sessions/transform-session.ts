import { Data, TransformEdge, TransformCorner, Bounds } from "types"
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
  currentBounds: Bounds
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

    this.currentBounds = { ...this.snapshot.initialBounds }

    this.corners = {
      a: [minX, minY],
      b: [maxX, maxY],
    }
  }

  update(data: Data, point: number[]) {
    const { shapeBounds, currentPageId, selectedIds } = this.snapshot
    const {
      document: { pages },
    } = data

    let [x, y] = point
    const { corners, transformType } = this

    // Edge Transform

    switch (transformType) {
      case TransformEdge.Top: {
        corners.a[1] = y
        break
      }
      case TransformEdge.Right: {
        corners.b[0] = x
        break
      }
      case TransformEdge.Bottom: {
        corners.b[1] = y
        break
      }
      case TransformEdge.Left: {
        corners.a[0] = x
        break
      }
      case TransformCorner.TopLeft: {
        corners.a[1] = y
        corners.a[0] = x
        break
      }
      case TransformCorner.TopRight: {
        corners.b[0] = x
        corners.a[1] = y
        break
      }
      case TransformCorner.BottomRight: {
        corners.b[1] = y
        corners.b[0] = x
        break
      }
      case TransformCorner.BottomLeft: {
        corners.a[0] = x
        corners.b[1] = y
        break
      }
    }

    const newBounds = {
      minX: Math.min(corners.a[0], corners.b[0]),
      minY: Math.min(corners.a[1], corners.b[1]),
      maxX: Math.max(corners.a[0], corners.b[0]),
      maxY: Math.max(corners.a[1], corners.b[1]),
      width: Math.abs(corners.b[0] - corners.a[0]),
      height: Math.abs(corners.b[1] - corners.a[1]),
    }

    const isFlippedX = corners.b[0] - corners.a[0] < 0
    const isFlippedY = corners.b[1] - corners.a[1] < 0

    // const dx = newBounds.minX - currentBounds.minX
    // const dy = newBounds.minY - currentBounds.minY
    // const scaleX = newBounds.width / currentBounds.width
    // const scaleY = newBounds.height / currentBounds.height

    this.currentBounds = newBounds

    selectedIds.forEach((id) => {
      const { nx, nmx, nw, ny, nmy, nh } = shapeBounds[id]

      const minX = newBounds.minX + (isFlippedX ? nmx : nx) * newBounds.width
      const minY = newBounds.minY + (isFlippedY ? nmy : ny) * newBounds.height
      const width = nw * newBounds.width
      const height = nh * newBounds.height

      const shape = pages[currentPageId].shapes[id]

      getShapeUtils(shape).transform(shape, {
        minX,
        minY,
        maxX: minX + width,
        maxY: minY + height,
        width,
        height,
      })
      // utils.stretch(shape, scaleX, scaleY)
    })

    // switch (this.transformHandle) {
    //   case TransformEdge.Top:
    //   case TransformEdge.Left:
    //   case TransformEdge.Right:
    //   case TransformEdge.Bottom: {
    //     for (let id in shapeBounds) {
    //       const { ny, nmy, nh } = shapeBounds[id]
    //       const minY = v.my + (v.y1 < v.y0 ? nmy : ny) * v.mh
    //       const height = nh * v.mh

    //       const shape = pages[currentPageId].shapes[id]

    //       getShapeUtils(shape).transform(shape)
    //     }
    //   }
    //   case TransformCorner.TopLeft:
    //   case TransformCorner.TopRight:
    //   case TransformCorner.BottomLeft:
    //   case TransformCorner.BottomRight: {
    //   }
    // }
  }

  cancel(data: Data) {
    const { currentPageId } = this.snapshot
    const { document } = data

    // for (let id in shapes) {
    // Restore shape using original bounds
    // document.pages[currentPageId].shapes[id]
    // }
  }

  complete(data: Data) {
    // commands.translate(data, this.snapshot, getTransformSnapshot(data))
  }
}

export function getTransformSnapshot(data: Data) {
  const {
    document: { pages },
    selectedIds,
    currentPageId,
  } = current(data)

  // A mapping of selected shapes and their bounds
  const shapesBounds = Object.fromEntries(
    Array.from(selectedIds.values()).map((id) => {
      const shape = pages[currentPageId].shapes[id]
      return [shape.id, getShapeUtils(shape).getBounds(shape)]
    })
  )

  // The common (exterior) bounds of the selected shapes
  const bounds = getCommonBounds(
    ...Array.from(selectedIds.values()).map((id) => {
      const shape = pages[currentPageId].shapes[id]
      return getShapeUtils(shape).getBounds(shape)
    })
  )

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
            ...bounds,
            nx: (minX - bounds.minX) / bounds.width,
            ny: (minY - bounds.minY) / bounds.height,
            nmx: 1 - (minX + width - bounds.minX) / bounds.width,
            nmy: 1 - (minY + height - bounds.minY) / bounds.height,
            nw: width / bounds.width,
            nh: height / bounds.height,
          },
        ]
      })
    ),
  }
}

export type TransformSnapshot = ReturnType<typeof getTransformSnapshot>
