import type { Data, Command } from '../../state-types'

// - [x] Delete shapes
// - [ ] Delete bindings too
// - [ ] Update parents and possibly delete parents

export function deleteShapes(data: Data, ids: string[]): Command {
  // We also need to delete any bindings that reference the deleted shapes
  const bindingIdsToDelete = Object.values(data.page.bindings)
    .filter((binding) => ids.includes(binding.fromId) || ids.includes(binding.toId))
    .map((binding) => binding.id)

  // We also need to update any shapes that reference the deleted bindings
  const shapesWithBindingsToUpdate = Object.values(data.page.shapes).filter(
    (shape) =>
      shape.handles &&
      Object.values(shape.handles).some(
        (handle) => handle.bindingId && bindingIdsToDelete.includes(handle.bindingId)
      )
  )

  return {
    id: 'delete_shapes',
    before: {
      page: {
        shapes: {
          ...Object.fromEntries(ids.map((id) => [id, data.page.shapes[id]])),
          ...Object.fromEntries(
            shapesWithBindingsToUpdate.map((shape) => {
              let handle = Object.values(shape.handles!).find((handle) => {
                const bindingId = handle.bindingId

                if (bindingId && bindingIdsToDelete.includes(bindingId)) {
                  return handle
                }

                return false
              })!

              return [shape.id, { handles: { [handle.id]: { bindingId: handle } } }]
            })
          ),
        },
        bindings: Object.fromEntries(bindingIdsToDelete.map((id) => [id, data.page.bindings[id]])),
      },
      pageState: {
        selectedIds: [...data.pageState.selectedIds],
        hoveredId: undefined,
      },
    },
    after: {
      page: {
        shapes: {
          ...Object.fromEntries(
            shapesWithBindingsToUpdate.map((shape) => {
              for (const id in shape.handles) {
                const handle = shape.handles[id as keyof typeof shape.handles]
                const bindingId = handle.bindingId
                if (bindingId && bindingIdsToDelete.includes(bindingId)) {
                  handle.bindingId = undefined
                }
              }
              return [shape.id, shape]
            })
          ),
          ...Object.fromEntries(ids.map((id) => [id, undefined])),
        },
        bindings: Object.fromEntries(bindingIdsToDelete.map((id) => [id, undefined])),
      },
      pageState: {
        selectedIds: [],
        hoveredId: undefined,
      },
    },
  }
}
