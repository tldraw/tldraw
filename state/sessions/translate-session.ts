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

  constructor(data: Data, point: number[]) {
    super(data)
    this.origin = point
    this.snapshot = getTranslateSnapshot(data)
  }

  update(data: Data, point: number[], isCloning: boolean) {
    const { currentPageId, clones, initialShapes } = this.snapshot
    const { document } = data
    const { shapes } = document.pages[this.snapshot.currentPageId]

    const delta = vec.vec(this.origin, point)

    if (isCloning && !this.isCloning) {
      // Enter cloning state, create clones at shape points and move shapes
      // back to initial point.
      this.isCloning = true
      data.selectedIds.clear()
      for (let id in clones) {
        const clone = clones[id]
        data.selectedIds.add(clone.id)
        shapes[id].point = initialShapes[id].point
        data.document.pages[currentPageId].shapes[clone.id] = clone
      }
    } else if (!isCloning && this.isCloning) {
      // Exit cloning state, delete up clones and move shapes to clone points
      this.isCloning = false
      data.selectedIds.clear()
      for (let id in clones) {
        const clone = clones[id]
        data.selectedIds.add(id)
        delete data.document.pages[currentPageId].shapes[clone.id]
      }
    }

    // Calculate the new points and update data
    for (let id in initialShapes) {
      const point = vec.add(initialShapes[id].point, delta)
      const targetId = this.isCloning ? clones[id].id : id
      document.pages[currentPageId].shapes[targetId].point = point
    }
  }

  cancel(data: Data) {
    const { document } = data
    const { initialShapes, clones, currentPageId } = this.snapshot

    const { shapes } = document.pages[currentPageId]

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
