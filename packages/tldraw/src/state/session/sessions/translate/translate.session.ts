import { Utils, Vec } from '@tldraw/core'
import type { TLBinding } from 'packages/core/src/types'
import type { TLDrawShape } from '../../../../shape'
import type { Session } from '../../../state-types'
import type { Data } from '../../../state-types'
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
            initialShapes.map((shape) => [
              shape.id,
              { ...next.page.shapes[shape.id], point: shape.point },
            ])
          ),
        }

        next.page.shapes = {
          ...next.page.shapes,
          ...Object.fromEntries(
            clones.map((clone) => [
              clone.id,
              { ...clone, point: Vec.round(Vec.add(clone.point, delta)) },
            ])
          ),
        }

        next.pageState.selectedIds = clones.map((c) => c.id)

        for (const binding of this.snapshot.clonedBindings) {
          next.page.bindings[binding.id] = binding
        }

        next.page.bindings = { ...next.page.bindings }
      }

      // Either way, move the clones

      next.page.shapes = {
        ...next.page.shapes,
        ...Object.fromEntries(
          clones.map((clone) => [
            clone.id,
            {
              ...clone,
              point: Vec.round(Vec.add(next.page.shapes[clone.id].point, trueDelta)),
            },
          ])
        ),
      }

      return { page: { ...next.page }, pageState: { ...next.pageState } }
    }

    // If not cloning...

    // Cloning -> Not Cloning
    if (this.isCloning) {
      this.isCloning = false

      next.page.shapes = { ...next.page.shapes }

      // Delete the clones
      clones.forEach((clone) => delete next.page.shapes[clone.id])

      // Move the original shapes back to the cursor position
      initialShapes.forEach((shape) => {
        next.page.shapes[shape.id] = {
          ...next.page.shapes[shape.id],
          point: Vec.round(Vec.add(shape.point, delta)),
        }
      })

      // Delete the cloned bindings
      next.page.bindings = { ...next.page.bindings }

      for (const binding of this.snapshot.clonedBindings) {
        delete next.page.bindings[binding.id]
      }

      // Set selected ids
      next.pageState.selectedIds = initialShapes.map((c) => c.id)
    }

    // Move the shapes by the delta
    next.page.shapes = {
      ...next.page.shapes,
      ...Object.fromEntries(
        initialShapes.map((shape) => [
          shape.id,
          {
            ...next.page.shapes[shape.id],
            point: Vec.round(Vec.add(next.page.shapes[shape.id].point, trueDelta)),
          },
        ])
      ),
    }

    return { page: { ...next.page }, pageState: { ...next.pageState } }
  }

  cancel = (data: Data): Data => {
    return {
      page: {
        // @ts-ignore - We need to set deleted shapes to undefined in order to correctly deep merge them away.
        shapes: {
          ...data.page.shapes,
          ...Object.fromEntries(this.snapshot.clones.map((clone) => [clone.id, undefined])),
          ...Object.fromEntries(
            this.snapshot.initialShapes.map((shape) => [
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
        page: {
          shapes: {
            ...Object.fromEntries(this.snapshot.clones.map((clone) => [clone.id, undefined])),
            ...Object.fromEntries(
              this.snapshot.initialShapes.map((shape) => [shape.id, { point: shape.point }])
            ),
          },
          bindings: {
            ...Object.fromEntries(
              this.snapshot.clonedBindings.map((binding) => [binding.id, undefined])
            ),
          },
        },
        pageState: {
          selectedIds: this.snapshot.selectedIds,
          hoveredId: undefined,
        },
      },
      after: {
        page: {
          shapes: {
            ...Object.fromEntries(
              this.snapshot.clones.map((clone) => [clone.id, data.page.shapes[clone.id]])
            ),
            ...Object.fromEntries(
              this.snapshot.initialShapes.map((shape) => [
                shape.id,
                { point: data.page.shapes[shape.id].point },
              ])
            ),
          },
          bindings: {
            ...Object.fromEntries(
              this.snapshot.clonedBindings.map((binding) => [
                binding.id,
                data.page.bindings[binding.id],
              ])
            ),
          },
        },
        pageState: {
          selectedIds: [...data.pageState.selectedIds],
          hoveredId: undefined,
        },
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTranslateSnapshot(data: Data) {
  const selectedShapes = TLDR.getSelectedShapeSnapshot(data)

  const hasUnlockedShapes = selectedShapes.length > 0

  const cloneMap: Record<string, string> = {}

  const initialParents = Array.from(new Set(selectedShapes.map((s) => s.parentId)).values())
    .filter((id) => id !== data.page.id)
    .map((id) => {
      const shape = TLDR.getShape(data, id)
      return {
        id,
        children: shape.children,
      }
    })

  const clones = selectedShapes
    .filter((shape) => shape.children === undefined)
    .flatMap((shape) => {
      const clone: TLDrawShape = {
        ...shape,
        id: Utils.uniqueId(),
        parentId: shape.parentId,
        childIndex: TLDR.getChildIndexAbove(data, shape.id),
      }

      cloneMap[shape.id] = clone.id

      return clone
    })

  const clonedBindings: TLBinding[] = []

  selectedShapes.forEach((shape) => {
    if (!shape.handles) return

    for (const handle of Object.values(shape.handles)) {
      if (handle.bindingId) {
        const binding = data.page.bindings[handle.bindingId]
        const cloneBinding = {
          ...binding,
          id: Utils.uniqueId(),
          fromId: cloneMap[binding.fromId] || binding.fromId,
          toId: cloneMap[binding.toId] || binding.toId,
        }

        clonedBindings.push(cloneBinding)
      }
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
    clones,
    clonedBindings,
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>
