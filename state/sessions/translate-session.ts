import { Data } from "types"
import * as vec from "utils/vec"
import BaseSession from "./base-session"
import commands from "state/commands"
import { current } from "immer"

export default class TranslateSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  snapshot: TranslateSnapshot

  constructor(data: Data, point: number[]) {
    super(data)
    this.origin = point
    this.snapshot = getTranslateSnapshot(data)
  }

  update(data: Data, point: number[]) {
    const { currentPageId, shapes } = this.snapshot
    const { document } = data

    const delta = vec.vec(this.origin, point)

    for (let shape of shapes) {
      document.pages[currentPageId].shapes[shape.id].point = vec.add(
        shape.point,
        delta
      )
    }
  }

  cancel(data: Data) {
    const { document } = data

    for (let shape of this.snapshot.shapes) {
      document.pages[this.snapshot.currentPageId].shapes[shape.id].point =
        shape.point
    }
  }

  complete(data: Data) {
    commands.translate(data, this.snapshot, getTranslateSnapshot(data))
  }
}

export function getTranslateSnapshot(data: Data) {
  const {
    document: { pages },
    currentPageId,
  } = current(data)

  const { shapes } = pages[currentPageId]

  return {
    currentPageId,
    shapes: Array.from(data.selectedIds.values())
      .map((id) => shapes[id])
      .map(({ id, point }) => ({ id, point })),
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>
