import { TLDrawBinding, TLDrawShape, TLDrawShapeType } from '~types'
import { Utils } from '@tldraw/core'
import type { Data, TLDrawCommand } from '~types'
import { TLDR } from '~state/tldr'
import type { Patch } from 'rko'

export function group(
  data: Data,
  ids: string[],
  groupId = Utils.uniqueId()
): TLDrawCommand | undefined {
  const beforeShapes: Record<string, Patch<TLDrawShape | undefined>> = {}
  const afterShapes: Record<string, Patch<TLDrawShape | undefined>> = {}

  const beforeBindings: Record<string, Patch<TLDrawBinding | undefined>> = {}
  const afterBindings: Record<string, Patch<TLDrawBinding | undefined>> = {}

  const { currentPageId } = data.appState

  const initialShapes = ids.map((id) => TLDR.getShape(data, id, currentPageId))

  // 1. Can we create this group?

  // Do the shapes have the same parent?
  if (initialShapes.every((shape) => shape.parentId === initialShapes[0].parentId)) {
    // Is the common parent a shape (not the page)?
    if (initialShapes[0].parentId !== currentPageId) {
      const commonParent = TLDR.getShape(data, initialShapes[0].parentId, currentPageId)
      // Are all of the common parent's shapes selected?
      if (commonParent.children?.length === ids.length) {
        // Don't create a group if that group would be the same as the
        // existing group.
        return
      }
    }
  }

  // A flattened array of shapes from the page
  const flattenedShapes = TLDR.flattenPage(data, currentPageId)

  // A map of shapes to their index in flattendShapes
  const shapeIndexMap = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, flattenedShapes.indexOf(shape)])
  )

  // An array of shapes in order by their index in flattendShapes
  const sortedShapes = initialShapes.sort((a, b) => shapeIndexMap[a.id] - shapeIndexMap[b.id])

  // The parentId comes from the first shape in flattendShapes
  const groupParentId = sortedShapes[0].parentId

  // Likewise for the child index
  const groupChildIndex = sortedShapes[0].childIndex

  // The shape's point is the min point of its childrens' common bounds
  const groupBounds = Utils.getCommonBounds(initialShapes.map((shape) => TLDR.getBounds(shape)))

  // Create the group
  beforeShapes[groupId] = undefined

  afterShapes[groupId] = TLDR.getShapeUtils({ type: TLDrawShapeType.Group } as TLDrawShape).create({
    id: groupId,
    childIndex: groupChildIndex,
    parentId: groupParentId,
    point: [groupBounds.minX, groupBounds.minY],
    size: [groupBounds.width, groupBounds.height],
    children: sortedShapes.map((shape) => shape.id),
  })

  // Collect parents (other groups) that will have lost children
  const otherEffectedGroups: TLDrawShape[] = []

  // Reparent shapes to the new group
  sortedShapes.forEach((shape, index) => {
    // If the shape is part of a different group, mark the parent shape for cleanup
    if (shape.parentId !== currentPageId) {
      const parentShape = TLDR.getShape(data, shape.parentId, currentPageId)
      otherEffectedGroups.push(parentShape)
    }

    beforeShapes[shape.id] = {
      ...beforeShapes[shape.id],
      parentId: shape.parentId,
      childIndex: shape.childIndex,
    }

    afterShapes[shape.id] = {
      ...afterShapes[shape.id],
      parentId: groupId,
      childIndex: index + 1,
    }
  })

  // These are the ids of deleted groups
  const deletedShapeIds: string[] = []

  // Clean up effected parents
  while (otherEffectedGroups.length > 0) {
    const shape = otherEffectedGroups.pop()
    if (!shape) break

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const nextChildren = (beforeShapes[shape.id]?.children || shape.children)!.filter(
      (childId) => childId && !(ids.includes(childId) || deletedShapeIds.includes(childId))
    )

    // If the parent has no children, remove it
    if (nextChildren.length === 0) {
      beforeShapes[shape.id] = shape
      afterShapes[shape.id] = undefined

      // And if that parent is part of a different group, mark it for cleanup
      if (shape.parentId !== currentPageId) {
        deletedShapeIds.push(shape.id)
        otherEffectedGroups.push(TLDR.getShape(data, shape.parentId, currentPageId))
      }
    } else {
      beforeShapes[shape.id] = {
        ...beforeShapes[shape.id],
        children: shape.children,
      }

      afterShapes[shape.id] = {
        ...afterShapes[shape.id],
        children: nextChildren,
      }
    }
  }

  // TODO: This code is copied from delete.command, create a shared helper

  const page = TLDR.getPage(data, currentPageId)

  // We also need to delete bindings that reference the deleted shapes
  Object.values(page.bindings).forEach((binding) => {
    for (const id of [binding.toId, binding.fromId]) {
      // If the binding references a deleted shape...
      if (afterShapes[id] === undefined) {
        // Delete this binding
        beforeBindings[binding.id] = binding
        afterBindings[binding.id] = undefined

        // Let's also look each the bound shape...
        const shape = TLDR.getShape(data, id, currentPageId)

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
              if (!deletedShapeIds.includes(id)) {
                afterShapes[id] = {
                  ...afterShapes[id],
                  handles: {
                    ...afterShapes[id]?.handles,
                    [handle.id]: { bindingId: undefined },
                  },
                }
              }
            })
        }
      }
    }
  })

  return {
    id: 'group_shapes',
    before: {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: beforeShapes,
            bindings: beforeBindings,
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: afterShapes,
            bindings: beforeBindings,
          },
        },
      },
    },
  }
}
