import { Utils, Vec } from '@tldraw/core'
import { TLDrawShape } from '../../../../shape'
import { Session } from '../../../state-types'
import { Data } from '../../../state-types'
import { TLDR } from '../../../tldr'

export class TranslateSession implements Session {
  id = 'translate'
  delta = [0, 0]
  prev = [0, 0]
  origin: number[]
  snapshot: TranslateSnapshot
  isCloning = false

  constructor(data: Data, point: number[]) {
    this.origin = point
    this.snapshot = getTranslateSnapshot(data)
  }

  start = (data: Data) => {
    return data
  }

  update = (data: Data, point: number[], isAligned = false, isCloning = false) => {
    const { clones, initialShapes } = this.snapshot

    const next = {
      ...data,
      page: { ...data.page },
      shapes: { ...data.page.shapes },
      pageState: { ...data.pageState },
    }

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

        next.page.shapes = {
          ...next.page.shapes,
          ...Object.fromEntries(
            initialShapes.map(shape => [
              shape.id,
              { ...next.page.shapes[shape.id], point: shape.point },
            ])
          ),
        }

        next.page.shapes = {
          ...next.page.shapes,
          ...Object.fromEntries(
            clones.map(clone => [clone.id, { ...clone, point: Vec.add(clone.point, delta) }])
          ),
        }

        next.pageState.selectedIds = clones.map(c => c.id)
      }

      // Either way, move the clones

      next.page.shapes = {
        ...next.page.shapes,
        ...Object.fromEntries(
          clones.map(clone => [
            clone.id,
            {
              ...clone,
              point: Vec.add(next.page.shapes[clone.id].point, trueDelta),
            },
          ])
        ),
      }

      return next
    }

    // If not cloning...

    // Cloning -> Not Cloning
    if (this.isCloning) {
      this.isCloning = false

      // Delete the clones
      clones.forEach(clone => delete next.page.shapes[clone.id])

      // Move the original shapes back to the cursor position
      next.page.shapes = {
        ...next.page.shapes,
        ...Object.fromEntries(
          initialShapes.map(shape => [
            shape.id,
            {
              ...next.page.shapes[shape.id],
              point: Vec.add(shape.point, delta),
            },
          ])
        ),
      }

      // Set selected ids
      next.pageState.selectedIds = initialShapes.map(c => c.id)
    }

    // Move the shapes by the delta
    next.page.shapes = {
      ...next.page.shapes,
      ...Object.fromEntries(
        initialShapes.map(shape => [
          shape.id,
          {
            ...next.page.shapes[shape.id],
            point: Vec.add(next.page.shapes[shape.id].point, trueDelta),
          },
        ])
      ),
    }

    return next
  }

  cancel = (data: Data): Data => {
    return {
      ...data,
      page: {
        ...data.page,
        // @ts-ignore - We need to set deleted shapes to undefined in order to correctly deep merge them away.
        shapes: {
          ...data.page.shapes,
          ...Object.fromEntries(this.snapshot.clones.map(clone => [clone.id, undefined])),
          ...Object.fromEntries(
            this.snapshot.initialShapes.map(shape => [
              shape.id,
              { ...data.page.shapes[shape.id], point: shape.point },
            ])
          ),
        },
      },
      pageState: {
        ...data.pageState,
        selectedIds: this.snapshot.selectedIds,
      },
    }
  }

  complete(data: Data) {
    return {
      id: 'translate',
      before: {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            ...Object.fromEntries(this.snapshot.clones.map(clone => [clone.id, undefined])),
            ...Object.fromEntries(
              this.snapshot.initialShapes.map(shape => [shape.id, { point: shape.point }])
            ),
          },
        },
        pageState: {
          ...data.pageState,
          selectedIds: this.snapshot.selectedIds,
        },
      },
      after: {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            ...Object.fromEntries(
              this.snapshot.clones.map(clone => [clone.id, data.page.shapes[clone.id]])
            ),
            ...Object.fromEntries(
              this.snapshot.initialShapes.map(shape => [
                shape.id,
                { point: data.page.shapes[shape.id].point },
              ])
            ),
          },
        },
        pageState: {
          ...data.pageState,
          selectedIds: [...data.pageState.selectedIds],
        },
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTranslateSnapshot(data: Data) {
  const selectedShapes = TLDR.getSelectedShapeSnapshot(data)

  const hasUnlockedShapes = selectedShapes.length > 0

  const initialParents = Array.from(new Set(selectedShapes.map(s => s.parentId)).values())
    .filter(id => id !== data.page.id)
    .map(id => {
      const shape = TLDR.getShape(data, id)
      return {
        id,
        children: shape.children,
      }
    })

  return {
    selectedIds: TLDR.getSelectedIds(data),
    hasUnlockedShapes,
    initialParents,
    initialShapes: selectedShapes.map(({ id, point, parentId }) => ({
      id,
      point,
      parentId,
    })),
    clones: selectedShapes
      .filter(shape => shape.children === undefined)
      .flatMap(shape => {
        const clone: TLDrawShape = {
          ...shape,
          id: Utils.uniqueId(),
          parentId: shape.parentId,
          childIndex: TLDR.getChildIndexAbove(data, shape.id),
        }

        return clone
      }),
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>
