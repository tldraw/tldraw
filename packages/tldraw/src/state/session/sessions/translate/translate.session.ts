import { Utils, Vec } from '@tldraw/core'
import type { TLDrawShape, TLDrawBinding, PagePartial, Session, Data, Command } from '~types'
import { TLDR } from '~state/tldr'

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

  start = (data: Data): Partial<Data> => {
    const { bindingsToDelete } = this.snapshot

    if (bindingsToDelete.length === 0) return data

    const nextBindings = { ...data.page.bindings }

    bindingsToDelete.forEach((binding) => delete nextBindings[binding.id])

    const nextShapes = { ...data.page.shapes }

    return {
      page: {
        ...data.page,
        shapes: nextShapes,
        bindings: nextBindings,
      },
    }
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

  cancel = (data: Data) => {
    const { initialShapes, clones, clonedBindings, bindingsToDelete } = this.snapshot

    const nextShapes: Record<string, TLDrawShape> = { ...data.page.shapes }
    const nextBindings = { ...data.page.bindings }

    // Put back any deleted bindings
    bindingsToDelete.forEach((binding) => (nextBindings[binding.id] = binding))

    // Put initial shapes back to where they started
    initialShapes.forEach(({ id, point }) => (nextShapes[id] = { ...nextShapes[id], point }))

    // Delete clones
    clones.forEach((clone) => delete nextShapes[clone.id])

    // Delete cloned bindings
    clonedBindings.forEach((binding) => delete nextBindings[binding.id])

    return {
      page: {
        ...data.page,
        shapes: nextShapes,
        bindings: nextBindings,
      },
      pageState: {
        ...data.pageState,
        selectedIds: this.snapshot.selectedIds,
      },
    }
  }

  complete(data: Data): Command {
    const { selectedIds, initialShapes, bindingsToDelete, clones, clonedBindings } = this.snapshot

    const before: PagePartial = {
      shapes: {
        ...Object.fromEntries(clones.map((clone) => [clone.id, undefined])),
        ...Object.fromEntries(initialShapes.map((shape) => [shape.id, { point: shape.point }])),
      },
      bindings: {
        ...Object.fromEntries(clonedBindings.map((binding) => [binding.id, undefined])),
        ...Object.fromEntries(bindingsToDelete.map((binding) => [binding.id, binding])),
      },
    }

    const after: PagePartial = {
      shapes: {
        ...Object.fromEntries(clones.map((clone) => [clone.id, data.page.shapes[clone.id]])),
        ...Object.fromEntries(
          initialShapes.map((shape) => [shape.id, { point: data.page.shapes[shape.id].point }])
        ),
      },
      bindings: {
        ...Object.fromEntries(
          clonedBindings.map((binding) => [binding.id, data.page.bindings[binding.id]])
        ),
        ...Object.fromEntries(bindingsToDelete.map((binding) => [binding.id, undefined])),
      },
    }

    bindingsToDelete.forEach((binding) => {
      for (const id of [binding.toId, binding.fromId]) {
        // Let's also look at the bound shape...
        const shape = data.page.shapes[id]

        // If the bound shape has a handle that references the deleted binding, delete that reference
        if (!shape.handles) continue

        Object.values(shape.handles)
          .filter((handle) => handle.bindingId === binding.id)
          .forEach((handle) => {
            before.shapes[id] = {
              ...before.shapes[id],
              handles: {
                ...before.shapes[id]?.handles,
                [handle.id]: { bindingId: binding.id },
              },
            }
            after.shapes[id] = {
              ...after.shapes[id],
              handles: { ...after.shapes[id]?.handles, [handle.id]: { bindingId: undefined } },
            }
          })
      }
    })

    return {
      id: 'translate',
      before: {
        page: before,
        pageState: {
          selectedIds,
        },
      },
      after: {
        page: after,
        pageState: {
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

  const clonedBindings: TLDrawBinding[] = []

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

  const selectedIds = TLDR.getSelectedIds(data)

  const bindingsToDelete = TLDR.getRelatedBindings(
    data,
    selectedShapes.filter((shape) => shape.handles !== undefined).map((shape) => shape.id)
  )

  return {
    selectedIds,
    bindingsToDelete,
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
