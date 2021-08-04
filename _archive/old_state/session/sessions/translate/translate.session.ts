import { Vec, Utils } from '@tldraw/core'
import { BaseSession } from '.././session-types'
import { Data } from '../../../../types'
import { TLDrawShape } from '../../../../shape'
import * as commands from '../../../command'
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
    const { clones, initialShapes } = this.snapshot

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

    // If cloning...
    if (isCloning) {
      // Not Cloning -> Cloning
      if (!this.isCloning) {
        this.isCloning = true

        // Move original shapes back to start
        for (const { id, point } of initialShapes) {
          TLD.mutate(data, data.page.shapes[id], { point })
        }

        TLD.createShapes(
          data,
          clones.map((clone) => ({ ...clone, point: Vec.add([...clone.point], delta) })),
        )

        TLD.setSelectedIds(
          data,
          clones.map((c) => c.id),
        )
      }

      // Either way, move the clones
      for (const { id } of clones) {
        const shape = data.page.shapes[id]
        TLD.mutate(data, shape, { point: Vec.add(shape.point, trueDelta) })
      }
      return
    }

    // If not cloning...

    // Cloning -> Not Cloning
    if (this.isCloning) {
      this.isCloning = false

      // Delete the clones
      TLD.deleteShapes(
        data,
        clones.map((clone) => data.page.shapes[clone.id]),
      )

      // Move the original shapes back to the cursor position
      for (const initialShape of initialShapes) {
        TLD.getDocumentBranch(data, initialShape.id).forEach((id) => {
          const shape = data.page.shapes[id]
          TLD.mutate(data, shape, { point: Vec.add(shape.point, delta) })
        })
      }

      // Set selected ids
      TLD.setSelectedIds(
        data,
        initialShapes.map((c) => c.id),
      )
    }

    // Move the shapes by the delta
    TLD.getSelectedIds(data).forEach((id) => {
      TLD.getDocumentBranch(data, id).forEach((id) => {
        const shape = data.page.shapes[id]
        TLD.mutate(data, shape, { point: Vec.add(shape.point, trueDelta) })
      })
    })
  }

  cancel(data: Data): void {
    const { initialShapes, initialParents, clones } = this.snapshot
    const { shapes } = data.page

    for (const { id } of initialShapes) {
      TLD.getDocumentBranch(data, id).forEach((id) => {
        const shape = shapes[id]
        TLD.mutate(data, shape, { point: Vec.add(shape.point, Vec.neg(this.delta)) })
      })
    }

    for (const { id } of clones) {
      delete shapes[id]
    }

    initialParents.forEach(({ id, children }) => {
      const shape = shapes[id]
      TLD.mutate(data, shape, { children })
    })

    const ids = initialShapes.map((s) => s.id)
    TLD.updateBindings(data, ids)
    TLD.updateParents(data, ids)
  }

  complete(data: Data) {
    if (!this.snapshot.hasUnlockedShapes) return undefined

    if (this.isCloning) {
      return commands.create(
        data,
        data.pageState.selectedIds.map((id) => Utils.deepClone(data.page.shapes[id])),
        true,
      )
    }

    const before = this.snapshot.initialShapes.map((shape) =>
      Utils.deepClone({
        ...data.page.shapes[shape.id],
        ...shape,
      }),
    )

    return commands.mutate(
      data,
      before,
      data.pageState.selectedIds.map((id) => Utils.deepClone(data.page.shapes[id])),
      'translating_shapes',
    )

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
//   if (clone.type !== TLDrawShapeType.Group) {
//     return [clone]
//   }

//   const page = tld.getPage(data)
//   const childClones = clone.children.flatMap((id) => {
//     const newId = uniqueId()
//     const source = page.shapes[id]
//     const next = { ...source, id: newId, parentId: clone.id }

//     if (next.type === TLDrawShapeType.Group) {
//       return [next, ...cloneGroup(data, next)]
//     }

//     return [next]
//   })

//   return [clone, ...childClones]
// }
