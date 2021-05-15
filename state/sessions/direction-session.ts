import { Data, LineShape, RayShape } from "types"
import * as vec from "utils/vec"
import BaseSession from "./base-session"
import commands from "state/commands"
import { current } from "immer"

export default class DirectionSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  snapshot: DirectionSnapshot

  constructor(data: Data, point: number[]) {
    super(data)
    this.origin = point
    this.snapshot = getDirectionSnapshot(data)
  }

  update(data: Data, point: number[]) {
    const { currentPageId, shapes } = this.snapshot
    const { document } = data

    for (let { id } of shapes) {
      const shape = document.pages[currentPageId].shapes[id] as
        | RayShape
        | LineShape

      shape.direction = vec.uni(vec.vec(shape.point, point))
    }
  }

  cancel(data: Data) {
    const { document } = data

    for (let { id, direction } of this.snapshot.shapes) {
      const shape = document.pages[this.snapshot.currentPageId].shapes[id] as
        | RayShape
        | LineShape

      shape.direction = direction
    }
  }

  complete(data: Data) {
    commands.direction(data, this.snapshot, getDirectionSnapshot(data))
  }
}

export function getDirectionSnapshot(data: Data) {
  const {
    document: { pages },
    currentPageId,
  } = current(data)

  const { shapes } = pages[currentPageId]

  let snapshapes: { id: string; direction: number[] }[] = []

  data.selectedIds.forEach((id) => {
    const shape = shapes[id]
    if ("direction" in shape) {
      snapshapes.push({ id: shape.id, direction: shape.direction })
    }
  })

  return {
    currentPageId,
    shapes: snapshapes,
  }
}

export type DirectionSnapshot = ReturnType<typeof getDirectionSnapshot>
