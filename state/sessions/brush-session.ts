import { current } from "immer"
import { ShapeUtil, Bounds, Data, Shapes } from "types"
import BaseSession from "./base-session"
import shapes, { getShapeUtils } from "lib/shape-utils"
import { getBoundsFromPoints } from "utils/utils"
import * as vec from "utils/vec"

interface BrushSnapshot {
  selectedIds: Set<string>
  shapes: { id: string; test: (bounds: Bounds) => boolean }[]
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

    const brushBounds = getBoundsFromPoints([origin, point])

    for (let { test, id } of snapshot.shapes) {
      if (test(brushBounds)) {
        data.selectedIds.add(id)
      } else if (data.selectedIds.has(id)) {
        data.selectedIds.delete(id)
      }
    }

    data.brush = brushBounds
  }

  cancel = (data: Data) => {
    data.brush = undefined
    data.selectedIds = new Set(this.snapshot.selectedIds)
  }

  complete = (data: Data) => {
    data.brush = undefined
  }

  /**
   * Get a snapshot of the current selected ids, for each shape that is
   * not already selected, the shape's id and a test to see whether the
   * brush will intersect that shape. For tests, start broad -> fine.
   * @param data
   * @returns
   */
  static getSnapshot(data: Data): BrushSnapshot {
    const {
      selectedIds,
      document: { pages },
      currentPageId,
    } = current(data)

    return {
      selectedIds: new Set(data.selectedIds),
      shapes: Object.values(pages[currentPageId].shapes)
        .filter((shape) => !selectedIds.has(shape.id))
        .map((shape) => ({
          id: shape.id,
          test: (brushBounds: Bounds): boolean =>
            getShapeUtils(shape).hitTestBounds(shape, brushBounds),
        })),
    }
  }
}
