import type { GroupShape, TLDrawBinding, TLDrawShape } from '~types'
import type { Data, TLDrawCommand, Patch } from '~types'
import { TLDR } from '~state/tldr'

export function ungroup(data: Data, groupId: string, pageId: string): TLDrawCommand | undefined {
  const beforeShapes: Record<string, Patch<TLDrawShape> | null> = {}
  const afterShapes: Record<string, Patch<TLDrawShape> | null> = {}

  const beforeBindings: Record<string, Patch<TLDrawBinding> | null> = {}
  const afterBindings: Record<string, Patch<TLDrawBinding> | null> = {}

  // The group shape
  const groupShape = TLDR.getShape<GroupShape>(data, groupId, pageId)

  const idsToUngroup = groupShape.children
  const shapesToUngroup: TLDrawShape[] = []
  const deletedGroupIds: string[] = []

  // Collect all of the shapes to group (and their ids)
  for (const id of idsToUngroup) {
    const shape = TLDR.getShape(data, id, pageId)
    shapesToUngroup.push(shape)
  }

  // We'll start placing the shapes at this childIndex
  const startingChildIndex = groupShape.childIndex

  // And we'll need to fit them under this child index
  const endingChildIndex = TLDR.getChildIndexAbove(data, groupShape.id, pageId)

  const step = (endingChildIndex - startingChildIndex) / shapesToUngroup.length

  // An array of shapes in order by their child index
  const sortedShapes = shapesToUngroup.sort((a, b) => a.childIndex - b.childIndex)

  // Remove the group shape
  beforeShapes[groupId] = groupShape
  afterShapes[groupId] = null

  // Reparent shapes to the page
  sortedShapes.forEach((shape, index) => {
    beforeShapes[shape.id] = {
      parentId: shape.parentId,
      childIndex: shape.childIndex,
    }

    afterShapes[shape.id] = {
      parentId: pageId,
      childIndex: startingChildIndex + step * index,
    }
  })

  const page = TLDR.getPage(data, pageId)

  // We also need to delete bindings that reference the deleted shapes
  Object.values(page.bindings)
    .filter((binding) => binding.toId === groupId || binding.fromId === groupId)
    .forEach((binding) => {
      for (const id of [binding.toId, binding.fromId]) {
        // If the binding references the deleted group...
        if (!afterShapes[id]) {
          // Delete the binding
          beforeBindings[binding.id] = binding
          afterBindings[binding.id] = null

          // Let's also look each the bound shape...
          const shape = TLDR.getShape(data, id, pageId)

          // If the bound shape has a handle that references the deleted binding...
          if (shape.handles) {
            Object.values(shape.handles)
              .filter((handle) => handle.bindingId === binding.id)
              .forEach((handle) => {
                // Save the binding reference in the before patch
                beforeShapes[id] = {
                  ...beforeShapes[id],
                  handles: {
                    ...beforeShapes[id]?.handles,
                    [handle.id]: { bindingId: binding.id },
                  },
                }

                // Unless we're currently deleting the shape, remove the
                // binding reference from the after patch
                if (!deletedGroupIds.includes(id)) {
                  afterShapes[id] = {
                    ...afterShapes[id],
                    handles: {
                      ...afterShapes[id]?.handles,
                      [handle.id]: { bindingId: null },
                    },
                  }
                }
              })
          }
        }
      }
    })

  return {
    id: 'ungroup',
    before: {
      document: {
        pages: {
          [pageId]: {
            shapes: beforeShapes,
            bindings: beforeBindings,
          },
        },
        pageStates: {
          [pageId]: {
            selectedIds: [groupId],
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: {
            shapes: afterShapes,
            bindings: beforeBindings,
          },
        },
        pageStates: {
          [pageId]: {
            selectedIds: idsToUngroup,
          },
        },
      },
    },
  }
}
