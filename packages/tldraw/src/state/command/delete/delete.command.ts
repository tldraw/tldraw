import type { Data, Command, PagePartial } from '~types'

// - [x] Delete shapes
// - [x] Delete bindings too
// - [ ] Update parents and possibly delete parents

export function deleteShapes(data: Data, ids: string[]): Command {
  const before: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const after: PagePartial = {
    shapes: {},
    bindings: {},
  }

  // These are the shapes we're definitely going to delete
  ids.forEach((id) => {
    before.shapes[id] = data.page.shapes[id]
    after.shapes[id] = undefined
  })

  // We also need to delete bindings that reference the deleted shapes
  Object.values(data.page.bindings).forEach((binding) => {
    for (const id of [binding.toId, binding.fromId]) {
      // If the binding references a deleted shape...
      if (after.shapes[id] === undefined) {
        // Delete this binding
        before.bindings[binding.id] = binding
        after.bindings[binding.id] = undefined

        // Let's also look at the bound shape...
        const shape = data.page.shapes[id]

        // If the bound shape has a handle that references the deleted binding, delete that reference
        if (shape.handles) {
          Object.values(shape.handles)
            .filter((handle) => handle.bindingId === binding.id)
            .forEach((handle) => {
              before.shapes[id] = {
                ...before.shapes[id],
                handles: { ...before.shapes[id]?.handles, [handle.id]: { bindingId: binding.id } },
              }
              after.shapes[id] = {
                ...after.shapes[id],
                handles: { ...after.shapes[id]?.handles, [handle.id]: { bindingId: undefined } },
              }
            })
        }
      }
    }
  })

  return {
    id: 'delete_shapes',
    before: {
      page: before,
      pageState: {
        selectedIds: [...data.pageState.selectedIds],
      },
    },
    after: {
      page: after,
      pageState: {
        selectedIds: [],
      },
    },
  }
}
