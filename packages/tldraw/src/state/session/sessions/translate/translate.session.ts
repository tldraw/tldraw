import { TLPageState, Utils, Vec } from '@tldraw/core'
import {
  TLDrawShape,
  TLDrawBinding,
  PagePartial,
  Session,
  Data,
  Command,
  TLDrawStatus,
  ShapesWithProp,
} from '~types'
import { TLDR } from '~state/tldr'

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

    const nextBindings: Record<string, Partial<TLDrawBinding> | undefined> = {}

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
    const { clones, initialShapes } = this.snapshot

    const nextBindings: Record<string, Partial<TLDrawBinding> | undefined> = {}
    const nextShapes: Record<string, Partial<TLDrawShape> | undefined> = {}
    const nextPageState: Partial<TLPageState> = {}

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

        initialShapes.forEach((shape) => (nextShapes[shape.id] = { point: shape.point }))

        clones.forEach(
          (shape) =>
            (nextShapes[shape.id] = { ...shape, point: Vec.round(Vec.add(shape.point, delta)) })
        )

        nextPageState.selectedIds = clones.map((shape) => shape.id)

        for (const binding of this.snapshot.clonedBindings) {
          nextBindings[binding.id] = binding
        }
      }

      // Either way, move the clones

      clones.forEach((shape) => {
        const current = nextShapes[shape.id] || TLDR.getShape(data, shape.id)

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
        const current = nextShapes[shape.id] || TLDR.getShape(data, shape.id)

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
          pageStates: {
            [data.appState.currentPageId]: nextPageState,
          },
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
          pageStates: {
            [data.appState.currentPageId]: nextPageState,
          },
        },
      },
    }
  }

  complete(data: Data): Command {
    const { initialShapes, bindingsToDelete, clones, clonedBindings } = this.snapshot

    const beforeBindings: Record<string, Partial<TLDrawBinding> | undefined> = {}
    const beforeShapes: Record<string, Partial<TLDrawShape> | undefined> = {}

    const afterBindings: Record<string, Partial<TLDrawBinding> | undefined> = {}
    const afterShapes: Record<string, Partial<TLDrawShape> | undefined> = {}

    clones.forEach((shape) => {
      beforeShapes[shape.id] = undefined
      afterShapes[shape.id] = this.isCloning ? TLDR.getShape(data, shape.id) : undefined
    })

    initialShapes.forEach((shape) => {
      beforeShapes[shape.id] = { point: shape.point }
      afterShapes[shape.id] = { point: TLDR.getShape(data, shape.id).point }
    })

    clonedBindings.forEach((binding) => {
      beforeBindings[binding.id] = undefined
      afterBindings[binding.id] = TLDR.getBinding(data, binding.id)
    })

    bindingsToDelete.forEach((binding) => {
      beforeBindings[binding.id] = binding

      for (const id of [binding.toId, binding.fromId]) {
        // Let's also look at the bound shape...
        const shape = TLDR.getShape(data, id)

        // If the bound shape has a handle that references the deleted binding, delete that reference
        if (!shape.handles) continue

        Object.values(shape.handles)
          .filter((handle) => handle.bindingId === binding.id)
          .forEach((handle) => {
            let shape: Partial<TLDrawShape> | undefined = beforeShapes[id]
            if (!shape) shape = {}

            TLDR.assertShapeHasProperty(shape as TLDrawShape, 'handles')

            if (!beforeShapes[id]) {
              beforeShapes[id] = { handles: {} }
            }

            if (!afterShapes[id]) {
              afterShapes[id] = { handles: {} }
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            beforeShapes[id].handles[handle.id] = { bindingId: binding.id }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            beforeShapes[id].handles[handle.id] = { bindingId: undefined }
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
              selectedIds: [...TLDR.getSelectedIds(data)],
            },
          },
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

  const page = TLDR.getPage(data)

  const initialParents = Array.from(new Set(selectedShapes.map((s) => s.parentId)).values())
    .filter((id) => id !== page.id)
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
        const binding = page.bindings[handle.bindingId]
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
