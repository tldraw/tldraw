import { Data, GroupShape, Shape, ShapeType } from 'types'
import * as vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { current } from 'immer'
import { v4 as uuid } from 'uuid'
import {
  getChildIndexAbove,
  getDocumentBranch,
  getPage,
  getPageState,
  getSelectedShapes,
  setSelectedIds,
  setToArray,
  updateParents,
} from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'

export default class TranslateSession extends BaseSession {
  delta = [0, 0]
  prev = [0, 0]
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

    const trueDelta = vec.sub(delta, this.prev)
    this.delta = delta
    this.prev = delta

    if (isCloning) {
      if (!this.isCloning) {
        this.isCloning = true

        // Move original shapes back to start
        for (const { id, point } of initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape).translateTo(shape, point)
          shapes[shape.id] = { ...shape }
        }

        for (const clone of clones) {
          shapes[clone.id] = { ...clone, point: [...clone.point] }

          const shape = shapes[clone.id]

          getShapeUtils(shape).translateBy(shape, delta)

          shapes[clone.id] = { ...shape }

          const parent = shapes[shape.parentId]

          if (!parent) continue

          getShapeUtils(parent).setProperty(parent, 'children', [
            ...parent.children,
            shape.id,
          ])

          shapes[shape.parentId] = { ...parent }
        }
      }

      for (const { id } of clones) {
        const shape = shapes[id]
        getShapeUtils(shape).translateBy(shape, trueDelta)
        shapes[id] = { ...shape }
      }

      setSelectedIds(
        data,
        clones.map((c) => c.id)
      )

      updateParents(
        data,
        clones.map((c) => c.id)
      )
    } else {
      if (this.isCloning) {
        this.isCloning = false

        setSelectedIds(
          data,
          initialShapes.map((c) => c.id)
        )

        for (const clone of clones) {
          delete shapes[clone.id]
        }

        for (const initialShape of initialShapes) {
          getDocumentBranch(data, initialShape.id).forEach((id) => {
            const shape = shapes[id]
            getShapeUtils(shape).translateBy(shape, delta)
            shapes[id] = { ...shape }
          })
        }

        initialParents.forEach((parent) => {
          const shape = shapes[parent.id] as GroupShape
          shapes[parent.id] = { ...shape, children: parent.children }
        })
      }

      for (const initialShape of initialShapes) {
        getDocumentBranch(data, initialShape.id).forEach((id) => {
          const shape = shapes[id]
          getShapeUtils(shape).translateBy(shape, trueDelta)

          shapes[id] = { ...shape }
        })
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

    for (const { id } of initialShapes) {
      getDocumentBranch(data, id).forEach((id) => {
        const shape = shapes[id]
        getShapeUtils(shape).translateBy(shape, vec.neg(this.delta))
      })
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

  // Get selected shapes
  // Filter out the locked shapes
  // Collect the branch children for each remaining shape
  // Filter out doubles using a set
  // End up with an array of ids for all of the shapes that will change
  // Map into shapes from data snapshot

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
    clones: selectedShapes
      .filter((shape) => shape.type !== ShapeType.Group)
      .flatMap((shape) => {
        const clone = {
          ...shape,
          id: uuid(),
          seed: Math.random(),
          parentId: shape.parentId,
          childIndex: getChildIndexAbove(cData, shape.id),
        }

        return clone
      }),
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>

function cloneGroup(data: Data, clone: Shape): Shape[] {
  if (clone.type !== ShapeType.Group) {
    return [clone]
  }

  const page = getPage(data)
  const childClones = clone.children.flatMap((id) => {
    const newId = uuid()
    const source = page.shapes[id]
    const next = { ...source, id: newId, parentId: clone.id }

    if (next.type === ShapeType.Group) {
      return [next, ...cloneGroup(data, next)]
    }

    return [next]
  })

  return [clone, ...childClones]
}
