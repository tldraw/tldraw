import { Data, GroupShape, Shape, ShapeType } from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { uniqueId } from 'utils'
import { getShapeUtils } from 'state/shape-utils'
import tld from 'utils/tld'

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

  update(
    data: Data,
    point: number[],
    isAligned: boolean,
    isCloning: boolean
  ): void {
    const { clones, initialShapes, initialParents } = this.snapshot
    const { shapes } = tld.getPage(data)

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

      tld.setSelectedIds(
        data,
        clones.map((c) => c.id)
      )

      tld.updateParents(
        data,
        clones.map((c) => c.id)
      )
    } else {
      if (this.isCloning) {
        this.isCloning = false

        tld.setSelectedIds(
          data,
          initialShapes.map((c) => c.id)
        )

        for (const clone of clones) {
          delete shapes[clone.id]
        }

        for (const initialShape of initialShapes) {
          tld.getDocumentBranch(data, initialShape.id).forEach((id) => {
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
        tld.getDocumentBranch(data, initialShape.id).forEach((id) => {
          const shape = shapes[id]
          getShapeUtils(shape).translateBy(shape, trueDelta)

          shapes[id] = { ...shape }
        })
      }

      tld.updateParents(
        data,
        initialShapes.map((s) => s.id)
      )
    }
  }

  cancel(data: Data): void {
    const { initialShapes, initialParents, clones } = this.snapshot
    const { shapes } = tld.getPage(data)

    for (const { id } of initialShapes) {
      tld.getDocumentBranch(data, id).forEach((id) => {
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

    tld.updateParents(
      data,
      initialShapes.map((s) => s.id)
    )
  }

  complete(data: Data): void {
    if (!this.snapshot.hasUnlockedShapes) return

    commands.translate(
      data,
      this.snapshot,
      getTranslateSnapshot(data),
      this.isCloning
    )
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTranslateSnapshot(data: Data) {
  const page = tld.getPage(data)

  const selectedShapes = tld.getSelectedShapeSnapshot(data)

  const hasUnlockedShapes = selectedShapes.length > 0

  const initialParents = Array.from(
    new Set(selectedShapes.map((s) => s.parentId)).values()
  )
    .filter((id) => id !== data.currentPageId)
    .map((id) => {
      const shape = page.shapes[id]
      return {
        id: shape.id,
        children: shape.children,
      }
    })

  return {
    hasUnlockedShapes,
    currentPageId: data.currentPageId,
    initialParents,
    initialShapes: selectedShapes.map(({ id, point, parentId }) => ({
      id,
      point,
      parentId,
    })),
    clones: selectedShapes
      .filter((shape) => shape.type !== ShapeType.Group)
      .flatMap((shape) => {
        const clone: Shape = {
          ...shape,
          id: uniqueId(),
          parentId: shape.parentId,
          childIndex: tld.getChildIndexAbove(data, shape.id),
          isGenerated: false,
        }

        return clone
      }),
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>

// function cloneGroup(data: Data, clone: Shape): Shape[] {
//   if (clone.type !== ShapeType.Group) {
//     return [clone]
//   }

//   const page = tld.getPage(data)
//   const childClones = clone.children.flatMap((id) => {
//     const newId = uniqueId()
//     const source = page.shapes[id]
//     const next = { ...source, id: newId, parentId: clone.id }

//     if (next.type === ShapeType.Group) {
//       return [next, ...cloneGroup(data, next)]
//     }

//     return [next]
//   })

//   return [clone, ...childClones]
// }
