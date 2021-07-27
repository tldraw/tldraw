import { Vec, Utils } from '@tldraw/core'
import { BaseSession } from '.././session-types'
import { Data } from '../../../../types'
import { getShapeUtils, TLDrawShape } from '../../../../shapes'
import { mutate } from '../../../commands'
import { TLD } from '../../../tld'

export class TranslateSession implements BaseSession {
  delta = [0, 0]
  prev = [0, 0]
  origin: number[]
  snapshot: TranslateSnapshot
  isCloning = false

  constructor(data: Data, point: number[]) {
    this.origin = point
    this.snapshot = getTranslateSnapshot(data)
  }

  update(data: Data, point: number[], isAligned = false, isCloning = false): void {
    const { clones, initialShapes, initialParents } = this.snapshot
    const { shapes } = data.page

    const delta = Vec.sub(point, this.origin)

    if (isAligned) {
      if (Math.abs(delta[0]) < Math.abs(delta[1])) {
        delta[0] = 0
      } else {
        delta[1] = 0
      }
    }

    const trueDelta = Vec.sub(delta, this.prev)

    this.delta = delta
    this.prev = delta

    // Not Cloning -> Not Cloning
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

          if (!(parent && parent.children)) continue

          getShapeUtils(parent).setProperty(parent, 'children', [...parent.children, shape.id])

          shapes[shape.parentId] = { ...parent }
        }
      }

      for (const { id } of clones) {
        const shape = shapes[id]
        getShapeUtils(shape).translateBy(shape, trueDelta)
        shapes[id] = { ...shape }
      }

      data.pageState.selectedIds = clones.map((c) => c.id)

      TLD.updateParents(
        data,
        clones.map((c) => c.id),
      )
      return
    }

    // Cloning -> Not Cloning
    if (this.isCloning) {
      this.isCloning = false

      data.pageState.selectedIds = initialShapes.map((c) => c.id)

      for (const clone of clones) {
        delete shapes[clone.id]
      }

      for (const initialShape of initialShapes) {
        TLD.getDocumentBranch(data, initialShape.id).forEach((id) => {
          const shape = shapes[id]
          getShapeUtils(shape).translateBy(shape, delta)
          shapes[id] = { ...shape }
        })
      }

      initialParents.forEach((parent) => {
        const shape = shapes[parent.id]
        shapes[parent.id] = { ...shape, children: parent.children }
      })

      return
    }

    for (const initialShape of initialShapes) {
      TLD.getDocumentBranch(data, initialShape.id).forEach((id) => {
        const shape = shapes[id]

        getShapeUtils(shape).translateBy(shape, trueDelta)

        shapes[id] = { ...shape }
      })
    }

    TLD.updateParents(
      data,
      initialShapes.map((s) => s.id),
    )
  }

  cancel(data: Data): void {
    const { initialShapes, initialParents, clones } = this.snapshot
    const { shapes } = data.page

    for (const { id } of initialShapes) {
      TLD.getDocumentBranch(data, id).forEach((id) => {
        const shape = shapes[id]
        getShapeUtils(shape).translateBy(shape, Vec.neg(this.delta))
      })
    }

    for (const { id } of clones) {
      delete shapes[id]
    }

    initialParents.forEach(({ id, children }) => {
      const shape = shapes[id]
      getShapeUtils(shape).setProperty(shape, 'children', children)
    })

    TLD.updateParents(
      data,
      initialShapes.map((s) => s.id),
    )
  }

  complete(data: Data) {
    if (!this.snapshot.hasUnlockedShapes) return

    const before = this.snapshot.initialShapes.map((shape) =>
      Utils.deepClone({
        ...data.page.shapes[shape.id],
        ...shape,
      }),
    )

    const after = data.pageState.selectedIds.map((id) => Utils.deepClone(data.page.shapes[id]))

    return mutate(data, before, after, 'translating shapes')

    // TODO
    // commands.translate(
    //   data,
    //   this.snapshot,
    //   getTranslateSnapshot(data),
    //   this.isCloning
    // )
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTranslateSnapshot(data: Data) {
  const { page } = data

  const selectedShapes = TLD.getSelectedShapeSnapshot(data)

  const hasUnlockedShapes = selectedShapes.length > 0

  const initialParents = Array.from(new Set(selectedShapes.map((s) => s.parentId)).values())
    .filter((id) => id !== data.page.id)
    .map((id) => {
      const shape = page.shapes[id]
      return {
        id: shape.id,
        children: shape.children,
      }
    })

  return {
    hasUnlockedShapes,
    currentPageId: data.page.id,
    initialParents,
    initialShapes: selectedShapes.map(({ id, point, parentId }) => ({
      id,
      point,
      parentId,
    })),
    clones: selectedShapes
      .filter((shape) => shape.children === undefined)
      .flatMap((shape) => {
        const clone: TLDrawShape = {
          ...shape,
          id: Utils.uniqueId(),
          parentId: shape.parentId,
          childIndex: TLD.getChildIndexAbove(data, shape.id),
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
