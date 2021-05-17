import { Data } from "types"
import * as vec from "utils/vec"
import BaseSession from "./base-session"
import commands from "state/commands"
import { current } from "immer"
import { getCommonBounds } from "utils/utils"
import { getShapeUtils } from "lib/shapes"

export default class RotateSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  snapshot: RotateSnapshot

  constructor(data: Data, point: number[]) {
    super(data)
    this.origin = point
    this.snapshot = getRotateSnapshot(data)
  }

  update(data: Data, point: number[]) {
    const { currentPageId, center, shapes } = this.snapshot
    const { document } = data

    const a1 = vec.angle(center, this.origin)
    const a2 = vec.angle(center, point)

    for (let { id, rotation } of shapes) {
      const shape = document.pages[currentPageId].shapes[id]
      shape.rotation = rotation + ((a2 - a1) % (Math.PI * 2))
    }
  }

  cancel(data: Data) {
    const { document } = data

    for (let shape of this.snapshot.shapes) {
      document.pages[this.snapshot.currentPageId].shapes[shape.id].rotation =
        shape.rotation
    }
  }

  complete(data: Data) {
    commands.rotate(data, this.snapshot, getRotateSnapshot(data))
  }
}

export function getRotateSnapshot(data: Data) {
  const {
    selectedIds,
    document: { pages },
    currentPageId,
  } = current(data)

  const shapes = Array.from(selectedIds.values()).map(
    (id) => pages[currentPageId].shapes[id]
  )

  // A mapping of selected shapes and their bounds
  const shapesBounds = Object.fromEntries(
    shapes.map((shape) => [shape.id, getShapeUtils(shape).getBounds(shape)])
  )

  // The common (exterior) bounds of the selected shapes
  const bounds = getCommonBounds(...Object.values(shapesBounds))

  const center = [
    bounds.minX + bounds.width / 2,
    bounds.minY + bounds.height / 2,
  ]

  return {
    currentPageId,
    center,
    shapes: shapes.map(({ id, rotation }) => ({
      id,
      rotation,
    })),
  }
}

export type RotateSnapshot = ReturnType<typeof getRotateSnapshot>
