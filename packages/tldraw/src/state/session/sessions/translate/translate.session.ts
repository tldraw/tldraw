import { TLPageState, Utils, Vec } from '@tldraw/core'
import {
  TLDrawShape,
  TLDrawBinding,
  Session,
  Data,
  TLDrawCommand,
  TLDrawStatus,
  ArrowShape,
} from '~types'
import { TLDR } from '~state/tldr'
import type { Patch } from 'rko'

export class TranslateSession implements Session {
  id = 'translate'
  status = TLDrawStatus.Translating
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
    const { bindingsToDelete } = this.snapshot

    if (bindingsToDelete.length === 0) return data

    const nextBindings: Patch<Record<string, TLDrawBinding>> = {}

    bindingsToDelete.forEach((binding) => (nextBindings[binding.id] = undefined))

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            bindings: nextBindings,
          },
        },
      },
    }
  }

  update = (data: Data, point: number[], isAligned = false, isCloning = false) => {
    const { clones, initialShapes, bindingsToDelete } = this.snapshot

    const nextBindings: Patch<Record<string, TLDrawBinding>> = {}
    const nextShapes: Patch<Record<string, TLDrawShape>> = {}
    const nextPageState: Patch<TLPageState> = {}

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

        // Put back any bindings we deleted

        bindingsToDelete.forEach((binding) => (nextBindings[binding.id] = binding))

        // Move original shapes back to start

        initialShapes.forEach((shape) => (nextShapes[shape.id] = { point: shape.point }))

        clones.forEach((clone) => {
          nextShapes[clone.id] = { ...clone, point: Vec.round(Vec.add(clone.point, delta)) }
        })

        nextPageState.selectedIds = clones.map((shape) => shape.id)

        for (const binding of this.snapshot.clonedBindings) {
          nextBindings[binding.id] = binding
        }
      }

      // Either way, move the clones

      clones.forEach((shape) => {
        const current = (nextShapes[shape.id] ||
          TLDR.getShape(data, shape.id, data.appState.currentPageId)) as TLDrawShape

        if (!current.point) throw Error('No point on that clone!')

        nextShapes[shape.id] = {
          ...nextShapes[shape.id],
          point: Vec.round(Vec.add(current.point, trueDelta)),
        }
      })
    } else {
      // If not cloning...

      // Cloning -> Not Cloning
      if (this.isCloning) {
        this.isCloning = false

        // Delete the bindings

        bindingsToDelete.forEach((binding) => (nextBindings[binding.id] = undefined))

        // Delete the clones
        clones.forEach((clone) => (nextShapes[clone.id] = undefined))

        // Move the original shapes back to the cursor position
        initialShapes.forEach((shape) => {
          nextShapes[shape.id] = {
            point: Vec.round(Vec.add(shape.point, delta)),
          }
        })

        // Delete the cloned bindings
        for (const binding of this.snapshot.clonedBindings) {
          nextBindings[binding.id] = undefined
        }

        // Set selected ids
        nextPageState.selectedIds = initialShapes.map((shape) => shape.id)
      }

      // Move the shapes by the delta
      initialShapes.forEach((shape) => {
        const current = (nextShapes[shape.id] ||
          TLDR.getShape(data, shape.id, data.appState.currentPageId)) as TLDrawShape

        if (!current.point) throw Error('No point on that clone!')

        nextShapes[shape.id] = {
          ...nextShapes[shape.id],
          point: Vec.round(Vec.add(current.point, trueDelta)),
        }
      })
    }

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: nextShapes,
            bindings: nextBindings,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: nextPageState,
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShapes, clones, clonedBindings, bindingsToDelete } = this.snapshot

    const nextBindings: Record<string, Partial<TLDrawBinding> | undefined> = {}
    const nextShapes: Record<string, Partial<TLDrawShape> | undefined> = {}
    const nextPageState: Partial<TLPageState> = {}

    // Put back any deleted bindings
    bindingsToDelete.forEach((binding) => (nextBindings[binding.id] = binding))

    // Put initial shapes back to where they started
    initialShapes.forEach(({ id, point }) => (nextShapes[id] = { ...nextShapes[id], point }))

    // Delete clones
    clones.forEach((clone) => (nextShapes[clone.id] = undefined))

    // Delete cloned bindings
    clonedBindings.forEach((binding) => (nextBindings[binding.id] = undefined))

    nextPageState.selectedIds = this.snapshot.selectedIds

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: nextShapes,
            bindings: nextBindings,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: nextPageState,
        },
      },
    }
  }

  complete(data: Data): TLDrawCommand {
    const pageId = data.appState.currentPageId

    const { initialShapes, bindingsToDelete, clones, clonedBindings } = this.snapshot

    const beforeBindings: Patch<Record<string, TLDrawBinding>> = {}
    const beforeShapes: Patch<Record<string, TLDrawShape>> = {}

    const afterBindings: Patch<Record<string, TLDrawBinding>> = {}
    const afterShapes: Patch<Record<string, TLDrawShape>> = {}

    clones.forEach((shape) => {
      beforeShapes[shape.id] = undefined
      afterShapes[shape.id] = this.isCloning ? TLDR.getShape(data, shape.id, pageId) : undefined
    })

    initialShapes.forEach((shape) => {
      beforeShapes[shape.id] = { point: shape.point }
      afterShapes[shape.id] = { point: TLDR.getShape(data, shape.id, pageId).point }
    })

    clonedBindings.forEach((binding) => {
      beforeBindings[binding.id] = undefined
      afterBindings[binding.id] = TLDR.getBinding(data, binding.id, pageId)
    })

    bindingsToDelete.forEach((binding) => {
      beforeBindings[binding.id] = binding

      for (const id of [binding.toId, binding.fromId]) {
        // Let's also look at the bound shape...
        const shape = TLDR.getShape(data, id, pageId)

        // If the bound shape has a handle that references the deleted binding, delete that reference
        if (!shape.handles) continue

        Object.values(shape.handles)
          .filter((handle) => handle.bindingId === binding.id)
          .forEach((handle) => {
            beforeShapes[id] = { ...beforeShapes[id], handles: {} }

            afterShapes[id] = { ...afterShapes[id], handles: {} }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            beforeShapes[id]!.handles![handle.id as keyof ArrowShape['handles']] = {
              bindingId: binding.id,
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            afterShapes[id]!.handles![handle.id as keyof ArrowShape['handles']] = {
              bindingId: undefined,
            }
          })
      }
    })

    return {
      id: 'translate',
      before: {
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: beforeShapes,
              bindings: beforeBindings,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              selectedIds: [...this.snapshot.selectedIds],
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: afterShapes,
              bindings: afterBindings,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              selectedIds: [...TLDR.getSelectedIds(data, data.appState.currentPageId)],
            },
          },
        },
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTranslateSnapshot(data: Data) {
  const selectedIds = TLDR.getSelectedIds(data, data.appState.currentPageId)

  const selectedShapes = TLDR.getSelectedShapeSnapshot(data, data.appState.currentPageId)

  const hasUnlockedShapes = selectedShapes.length > 0

  const page = TLDR.getPage(data, data.appState.currentPageId)

  const initialParents = Array.from(new Set(selectedShapes.map((s) => s.parentId)).values())
    .filter((id) => id !== page.id)
    .map((id) => {
      const shape = TLDR.getShape(data, id, data.appState.currentPageId)
      return {
        id,
        children: shape.children,
      }
    })

  const cloneMap: Record<string, string> = {}
  const clonedBindingsMap: Record<string, string> = {}
  const clonedBindings: TLDrawBinding[] = []

  // Create clones of selected shapes
  const clones = selectedShapes.flatMap((shape) => {
    const newId = Utils.uniqueId()

    cloneMap[shape.id] = newId

    const clone: TLDrawShape = {
      ...Utils.deepClone(shape),
      id: newId,
      parentId: shape.parentId,
      childIndex: TLDR.getChildIndexAbove(data, shape.id, data.appState.currentPageId),
    }

    if (!shape.children) return clone

    return [
      clone,
      ...shape.children.map((childId) => {
        const child = TLDR.getShape(data, childId, data.appState.currentPageId)

        const newChildId = Utils.uniqueId()

        cloneMap[shape.id] = newChildId

        return {
          ...Utils.deepClone(child),
          id: newChildId,
          parentId: shape.parentId,
          childIndex: TLDR.getChildIndexAbove(data, child.id, data.appState.currentPageId),
        }
      }),
    ]
  })

  // Create cloned bindings for shapes where both to and from shapes are selected
  // (if the user clones, then we will create a new binding for the clones)
  Object.values(page.bindings).forEach((binding) => {
    if (selectedIds.includes(binding.toId) && selectedIds.includes(binding.fromId)) {
      const cloneId = Utils.uniqueId()
      const cloneBinding = {
        ...Utils.deepClone(binding),
        id: cloneId,
        fromId: cloneMap[binding.fromId] || binding.fromId,
        toId: cloneMap[binding.toId] || binding.toId,
      }

      clonedBindingsMap[binding.id] = cloneId
      clonedBindings.push(cloneBinding)
    }
  })

  // Assign new binding ids to clones (or delete them!)
  clones.forEach((clone) => {
    if (clone.handles) {
      if (clone.handles) {
        for (const id in clone.handles) {
          const handle = clone.handles[id as keyof ArrowShape['handles']]
          handle.bindingId = handle.bindingId ? clonedBindingsMap[handle.bindingId] : undefined
        }
      }
    }
  })

  const bindingsToDelete = TLDR.getRelatedBindings(
    data,
    selectedShapes.filter((shape) => shape.handles !== undefined).map((shape) => shape.id),
    data.appState.currentPageId
  ).filter(
    // Don't delete bindings that are between both selected shapes
    (binding) => selectedIds.includes(binding.fromId) && !selectedIds.includes(binding.toId)
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
