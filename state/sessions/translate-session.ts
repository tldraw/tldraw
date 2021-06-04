import { Data, GroupShape, ShapeType } from 'types'
import * as vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { current } from 'immer'
import { v4 as uuid } from 'uuid'
import {
  getChildIndexAbove,
  getPage,
  getSelectedShapes,
  updateParents,
} from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'

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

  update(data: Data, point: number[], isAligned: boolean, isCloning: boolean) {
    const { currentPageId, clones, initialShapes, initialParents } =
      this.snapshot
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

        data.selectedIds.clear()

        for (const clone of clones) {
          data.selectedIds.add(clone.id)
          shapes[clone.id] = { ...clone }
          if (clone.parentId !== data.currentPageId) {
            const parent = shapes[clone.parentId]
            getShapeUtils(parent).setProperty(parent, 'children', [
              ...parent.children,
              clone.id,
            ])
          }
        }
      }

      for (const { id, point } of clones) {
        const shape = shapes[id]
        getShapeUtils(shape).translateTo(shape, vec.add(point, delta))
      }

      updateParents(
        data,
        clones.map((c) => c.id)
      )
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

        initialParents.forEach(
          (parent) =>
            ((shapes[parent.id] as GroupShape).children = parent.children)
        )
      }

      for (const initialShape of initialShapes) {
        const shape = shapes[initialShape.id]
        const next = vec.add(initialShape.point, delta)
        const deltaForShape = vec.sub(next, shape.point)
        getShapeUtils(shape).translateTo(shape, next)

        if (shape.type === ShapeType.Group) {
          for (let childId of shape.children) {
            const childShape = shapes[childId]
            getShapeUtils(childShape).translateBy(childShape, deltaForShape)
          }
        }
      }

      updateParents(
        data,
        initialShapes.map((s) => s.id)
      )
    }
  }

  cancel(data: Data) {
    const { initialShapes, initialParents, clones, currentPageId } =
      this.snapshot
    const { shapes } = getPage(data, currentPageId)

    for (const { id, point } of initialShapes) {
      const shape = shapes[id]
      const deltaForShape = vec.sub(point, shape.point)
      getShapeUtils(shape).translateTo(shape, point)

      if (shape.type === ShapeType.Group) {
        for (let childId of shape.children) {
          const childShape = shapes[childId]
          getShapeUtils(childShape).translateBy(childShape, deltaForShape)
        }
      }
    }

    for (const { id } of clones) {
      delete shapes[id]
    }

    initialParents.forEach(({ id, children }) => {
      const shape = shapes[id]
      getShapeUtils(shape).setProperty(shape, 'children', children)
    })

    updateParents(
      data,
      initialShapes.map((s) => s.id)
    )
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
  const page = getPage(cData)
  const selectedShapes = getSelectedShapes(cData).filter(
    (shape) => !shape.isLocked
  )
  const hasUnlockedShapes = selectedShapes.length > 0

  const parents = Array.from(
    new Set(selectedShapes.map((s) => s.parentId)).values()
  )
    .filter((id) => id !== data.currentPageId)
    .map((id) => page.shapes[id])

  return {
    hasUnlockedShapes,
    currentPageId: data.currentPageId,
    initialParents: parents.map(({ id, children }) => ({ id, children })),
    initialShapes: selectedShapes.map(({ id, point, parentId }) => ({
      id,
      point,
      parentId,
    })),
    clones: selectedShapes.map((shape) => ({
      ...shape,
      id: uuid(),
      parentId: shape.parentId,
      childIndex: getChildIndexAbove(cData, shape.id),
    })),
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>
