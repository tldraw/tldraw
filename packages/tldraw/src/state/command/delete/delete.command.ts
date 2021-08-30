import { TLDR } from '~state/tldr'
import type { Data, TLDrawCommand, PagePartial } from '~types'

// - [x] Delete shapes
// - [x] Delete bindings too
// - [ ] Delete bound shapes (arrows)
// - [ ] Update parents and possibly delete parents

export function deleteShapes(data: Data, ids: string[]): TLDrawCommand {
  const { currentPageId } = data.appState

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
    before.shapes[id] = TLDR.getShape(data, id, currentPageId)
    after.shapes[id] = undefined
  })

  const page = TLDR.getPage(data, currentPageId)

  // We also need to delete bindings that reference the deleted shapes
  Object.values(page.bindings).forEach((binding) => {
    for (const id of [binding.toId, binding.fromId]) {
      // If the binding references a deleted shape...
      if (after.shapes[id] === undefined) {
        // Delete this binding
        before.bindings[binding.id] = binding
        after.bindings[binding.id] = undefined

        // Let's also look at the bound shape...
        const shape = TLDR.getShape(data, id, currentPageId)

        // If the bound shape has a handle that references the deleted binding...
        if (shape.handles) {
          Object.values(shape.handles)
            .filter((handle) => handle.bindingId === binding.id && after.shapes[id] !== undefined)
            .forEach((handle) => {
              // Otherwise, delete the reference to the deleted binding
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
      document: {
        pages: {
          [currentPageId]: before,
        },
        pageStates: {
          [currentPageId]: { selectedIds: TLDR.getSelectedIds(data, currentPageId) },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: after,
        },
        pageStates: {
          [currentPageId]: { selectedIds: [] },
        },
      },
    },
  }
}
