import { Data } from "types"
import * as vec from "utils/vec"
import BaseSession from "./base-session"
import commands from "state/commands"
import { current } from "immer"
import { v4 as uuid } from "uuid"

export default class TranslateSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  snapshot: TranslateSnapshot
  isCloning = false

  constructor(data: Data, point: number[], isCloning = false) {
    super(data)
    this.origin = point
    this.snapshot = getTranslateSnapshot(data)
  }

  update(data: Data, point: number[], isAligned: boolean, isCloning: boolean) {
    const { currentPageId, clones, initialShapes } = this.snapshot
    const { shapes } = data.document.pages[currentPageId]
    const delta = vec.vec(this.origin, point)

    if (isAligned) {
      if (Math.abs(delta[0]) < Math.abs(delta[1])) {
        delta[0] = 0
      } else {
        delta[1] = 0
      }
    }

    if (isCloning && !this.isCloning) {
      this.isCloning = true
      for (let id in clones) {
        const clone = clones[id]
        shapes[clone.id] = clone
      }
    } else if (!isCloning && this.isCloning) {
      this.isCloning = false
      for (let id in clones) {
        const clone = clones[id]
        delete shapes[clone.id]
      }
    }

    for (let id in initialShapes) {
      shapes[id].point = vec.add(initialShapes[id].point, delta)
    }
  }

  cancel(data: Data) {
    const { initialShapes, clones, currentPageId } = this.snapshot
    const { shapes } = data.document.pages[currentPageId]

    for (let id in initialShapes) {
      shapes[id].point = initialShapes[id].point
      delete shapes[clones[id].id]
    }
  }

  complete(data: Data) {
    commands.translate(
      data,
      this.snapshot,
      getTranslateSnapshot(data),
      this.isCloning
    )
  }
}

export function getTranslateSnapshot(data: Data) {
  const {
    document: { pages },
    currentPageId,
  } = current(data)

  const shapes = Array.from(data.selectedIds.values()).map(
    (id) => pages[currentPageId].shapes[id]
  )

  // Clones and shapes are keyed under the same id, though the clone itself
  // has a different id.

  return {
    currentPageId,
    initialShapes: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
    clones: Object.fromEntries(
      shapes.map((shape) => [shape.id, { ...shape, id: uuid() }])
    ),
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>
