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

    if (isCloning) {
      if (!this.isCloning) {
        this.isCloning = true
        data.selectedIds.clear()

        for (const { id, point } of initialShapes) {
          shapes[id].point = point
        }

        for (const clone of clones) {
          shapes[clone.id] = { ...clone }
          data.selectedIds.add(clone.id)
        }
      }

      for (const { id, point } of clones) {
        shapes[id].point = vec.add(point, delta)
      }
    } else {
      if (this.isCloning) {
        this.isCloning = false
        data.selectedIds.clear()

        for (const { id } of initialShapes) {
          data.selectedIds.add(id)
        }

        for (const clone of clones) {
          delete shapes[clone.id]
        }
      }

      for (const { id, point } of initialShapes) {
        shapes[id].point = vec.add(point, delta)
      }
    }
  }

  cancel(data: Data) {
    const { initialShapes, clones, currentPageId } = this.snapshot
    const { shapes } = data.document.pages[currentPageId]

    for (const { id, point } of initialShapes) {
      shapes[id].point = point
    }

    for (const { id } of clones) {
      delete shapes[id]
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
  const { document, selectedIds, currentPageId } = current(data)

  const shapes = Array.from(selectedIds.values()).map(
    (id) => document.pages[currentPageId].shapes[id]
  )

  return {
    currentPageId,
    initialShapes: shapes.map(({ id, point }) => ({ id, point })),
    clones: shapes.map((shape) => ({ ...shape, id: uuid() })),
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>
