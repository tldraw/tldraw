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
    const { currentPageId, boundsCenter, shapes } = this.snapshot
    const { document } = data

    const a1 = vec.angle(boundsCenter, this.origin)
    const a2 = vec.angle(boundsCenter, point)

    data.boundsRotation =
      (this.snapshot.boundsRotation + (a2 - a1)) % (Math.PI * 2)

    for (let { id, center, offset, rotation } of shapes) {
      const shape = document.pages[currentPageId].shapes[id]
      shape.rotation = rotation + ((a2 - a1) % (Math.PI * 2))
      const newCenter = vec.rotWith(
        center,
        boundsCenter,
        (a2 - a1) % (Math.PI * 2)
      )
      shape.point = vec.sub(newCenter, offset)
    }
  }

  cancel(data: Data) {
    const { document } = data

    for (let { id, point, rotation } of this.snapshot.shapes) {
      const shape = document.pages[this.snapshot.currentPageId].shapes[id]
      shape.rotation = rotation
      shape.point = point
    }
  }

  complete(data: Data) {
    commands.rotate(data, this.snapshot, getRotateSnapshot(data))
  }
}

export function getRotateSnapshot(data: Data) {
  const {
    boundsRotation,
    selectedIds,
    currentPageId,
    document: { pages },
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

  const boundsCenter = [
    bounds.minX + bounds.width / 2,
    bounds.minY + bounds.height / 2,
  ]

  return {
    currentPageId,
    boundsCenter,
    boundsRotation,
    shapes: shapes.map(({ id, point, rotation }) => {
      const bounds = shapesBounds[id]
      const offset = [bounds.width / 2, bounds.height / 2]
      const center = vec.add(offset, [bounds.minX, bounds.minY])

      return {
        id,
        point,
        rotation,
        offset,
        center,
      }
    }),
  }
}

export type RotateSnapshot = ReturnType<typeof getRotateSnapshot>
