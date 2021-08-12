import { Vec } from '@tldraw/core'
import type { Data, Command, PagePartial } from '../../state-types'
import { TLDR } from '../../tldr'

export function translate(data: Data, ids: string[], delta: number[]): Command {
  const before: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const after: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const change = TLDR.mutateShapes(data, ids, (shape) => ({
    point: Vec.round(Vec.add(shape.point, delta)),
  }))

  before.shapes = change.before
  after.shapes = change.after

  const bindingsToDelete = TLDR.getRelatedBindings(data, ids)

  bindingsToDelete.forEach((binding) => {
    before.bindings[binding.id] = binding
    after.bindings[binding.id] = undefined

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
    id: 'translate_shapes',
    before: {
      page: {
        ...data.page,
        ...before,
      },
    },
    after: {
      page: {
        ...data.page,
        ...after,
      },
    },
  }
}
