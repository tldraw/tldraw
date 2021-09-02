import { Vec } from '@tldraw/core'
import type { Data, TLDrawCommand, PagePartial } from '~types'
import { TLDR } from '~state/tldr'

export function translate(data: Data, ids: string[], delta: number[]): TLDrawCommand {
  const { currentPageId } = data.appState

  const before: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const after: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const change = TLDR.mutateShapes(
    data,
    ids,
    (shape) => ({
      point: Vec.round(Vec.add(shape.point, delta)),
    }),
    currentPageId
  )

  before.shapes = change.before
  after.shapes = change.after

  const bindingsToDelete = TLDR.getBindings(data, currentPageId).filter((binding) =>
    ids.includes(binding.fromId)
  )

  bindingsToDelete.forEach((binding) => {
    before.bindings[binding.id] = binding
    after.bindings[binding.id] = undefined

    for (const id of [binding.toId, binding.fromId]) {
      // Let's also look at the bound shape...
      const shape = TLDR.getShape(data, id, data.appState.currentPageId)

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
    id: 'translate_shapes',
    before: {
      document: {
        pages: {
          [data.appState.currentPageId]: before,
        },
      },
    },
    after: {
      document: {
        pages: {
          [data.appState.currentPageId]: after,
        },
      },
    },
  }
}
