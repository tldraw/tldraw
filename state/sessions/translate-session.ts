import { Data } from 'types'
import * as vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { current } from 'immer'
import { v4 as uuid } from 'uuid'
import { getChildIndexAbove, getPage, getSelectedShapes } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'

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
    const { shapes } = getPage(data, currentPageId)

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
          const shape = shapes[id]
          getShapeUtils(shape).translateTo(shape, point)
        }

        for (const clone of clones) {
          shapes[clone.id] = { ...clone }
          data.selectedIds.add(clone.id)
        }
      }

      for (const { id, point } of clones) {
        const shape = shapes[id]
        getShapeUtils(shape).translateTo(shape, vec.add(point, delta))
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
        const shape = shapes[id]
        getShapeUtils(shape).translateTo(shape, vec.add(point, delta))
      }
    }
  }

  cancel(data: Data) {
    const { initialShapes, clones, currentPageId } = this.snapshot
    const { shapes } = getPage(data, currentPageId)

    for (const { id, point } of initialShapes) {
      const shape = shapes[id]
      getShapeUtils(shape).translateTo(shape, point)
    }

    for (const { id } of clones) {
      delete shapes[id]
    }
  }

  complete(data: Data) {
    if (!this.snapshot.hasUnlockedShapes) return

    commands.translate(
      data,
      this.snapshot,
      getTranslateSnapshot(data),
      this.isCloning
    )
  }
}

export function getTranslateSnapshot(data: Data) {
  const cData = current(data)
  const shapes = getSelectedShapes(cData).filter((shape) => !shape.isLocked)
  const hasUnlockedShapes = shapes.length > 0

  return {
    hasUnlockedShapes,
    currentPageId: data.currentPageId,
    initialShapes: shapes.map(({ id, point }) => ({ id, point })),
    clones: shapes.map((shape) => ({
      ...shape,
      id: uuid(),
      childIndex: getChildIndexAbove(cData, shape.id),
    })),
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>
