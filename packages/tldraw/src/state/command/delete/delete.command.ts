import { TLDR } from '~state/tldr'
import type { Data, TLDrawCommand, PagePartial, TLDrawShape, GroupShape } from '~types'

// - [ ] Update parents and possibly delete parents

export function deleteShapes(
  data: Data,
  ids: string[],
  pageId = data.appState.currentPageId
): TLDrawCommand {
  const before: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const after: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const parentsToUpdate: GroupShape[] = []

  const deletedIds = [...ids]

  // These are the shapes we're definitely going to delete

  ids.forEach((id) => {
    const shape = TLDR.getShape(data, id, pageId)
    before.shapes[id] = shape
    after.shapes[id] = undefined

    if (shape.parentId !== pageId) {
      parentsToUpdate.push(TLDR.getShape(data, shape.parentId, pageId))
    }
  })

  parentsToUpdate.forEach((parent) => {
    if (ids.includes(parent.id)) return
    deletedIds.push(parent.id)
    before.shapes[parent.id] = { children: parent.children }
    after.shapes[parent.id] = { children: parent.children.filter((id) => !ids.includes(id)) }
  })

  // Recursively check for empty parents?

  const page = TLDR.getPage(data, pageId)

  // We also need to delete bindings that reference the deleted shapes
  Object.values(page.bindings).forEach((binding) => {
    for (const id of [binding.toId, binding.fromId]) {
      // If the binding references a deleted shape...
      if (after.shapes[id] === undefined) {
        // Delete this binding
        before.bindings[binding.id] = binding
        after.bindings[binding.id] = undefined

        // Let's also look each the bound shape...
        const shape = TLDR.getShape(data, id, pageId)

        // If the bound shape has a handle that references the deleted binding...
        if (shape.handles) {
          Object.values(shape.handles)
            .filter((handle) => handle.bindingId === binding.id)
            .forEach((handle) => {
              // Save the binding reference in the before patch
              before.shapes[id] = {
                ...before.shapes[id],
                handles: {
                  ...before.shapes[id]?.handles,
                  [handle.id]: { bindingId: binding.id },
                },
              }

              // Unless we're currently deleting the shape, remove the
              // binding reference from the after patch
              if (!deletedIds.includes(id)) {
                after.shapes[id] = {
                  ...after.shapes[id],
                  handles: { ...after.shapes[id]?.handles, [handle.id]: { bindingId: undefined } },
                }
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
          [pageId]: before,
        },
        pageStates: {
          [pageId]: { selectedIds: TLDR.getSelectedIds(data, pageId) },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: after,
        },
        pageStates: {
          [pageId]: { selectedIds: [] },
        },
      },
    },
  }
}
