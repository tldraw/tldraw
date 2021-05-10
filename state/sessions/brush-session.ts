import { current } from "immer"
import { Bounds, Data, Shape } from "types"
import BaseSession from "./base-session"
import { screenToWorld, getBoundsFromPoints } from "utils/utils"
import * as vec from "utils/vec"

interface BrushSnapshot {
  selectedIds: string[]
  shapes: Shape[]
}

export default class BrushSession extends BaseSession {
  origin: number[]
  snapshot: BrushSnapshot

  constructor(data: Data, point: number[]) {
    super(data)

    this.origin = vec.round(point)

    this.snapshot = BrushSession.getSnapshot(data)
  }

  update = (data: Data, point: number[]) => {
    const { origin, snapshot } = this

    const bounds = getBoundsFromPoints(origin, point)

    data.brush = bounds

    const { minX: x, minY: y, width: w, height: h } = bounds

    data.selectedIds = [
      ...snapshot.selectedIds,
      ...snapshot.shapes.map((shape) => {
        return shape.id
      }),
    ]

    // Narrow the  the items on the screen
    data.brush = bounds
  }

  cancel = (data: Data) => {
    data.brush = undefined
    data.selectedIds = this.snapshot.selectedIds
  }

  complete = (data: Data) => {
    data.brush = undefined
  }

  static getSnapshot(data: Data) {
    const {
      document: { pages },
      currentPageId,
    } = current(data)

    return {
      selectedIds: [...data.selectedIds],
      shapes: Object.values(pages[currentPageId].shapes),
    }
  }
}
