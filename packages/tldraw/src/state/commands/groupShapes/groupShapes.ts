import { TLDrawBinding, TLDrawShape, TLDrawShapeType } from '~types'
import { Utils } from '@tldraw/core'
import type { Data, TLDrawCommand } from '~types'
import { TLDR } from '~state/TLDR'
import type { Patch } from 'rko'

export function groupShapes(
  data: Data,
  ids: string[],
  groupId: string,
  pageId: string
): TLDrawCommand | undefined {
  const beforeShapes: Record<string, Patch<TLDrawShape | undefined>> = {}
  const afterShapes: Record<string, Patch<TLDrawShape | undefined>> = {}

  const beforeBindings: Record<string, Patch<TLDrawBinding | undefined>> = {}
  const afterBindings: Record<string, Patch<TLDrawBinding | undefined>> = {}

  const idsToGroup = [...ids]
  const shapesToGroup: TLDrawShape[] = []
  const deletedGroupIds: string[] = []
  const otherEffectedGroups: TLDrawShape[] = []

  // Collect all of the shapes to group (and their ids)
  for (const id of ids) {
    const shape = TLDR.getShape(data, id, pageId)
    if (shape.children === undefined) {
      shapesToGroup.push(shape)
    } else {
      otherEffectedGroups.push(shape)
      idsToGroup.push(...shape.children)
      shapesToGroup.push(...shape.children.map((id) => TLDR.getShape(data, id, pageId)))
    }
  }

  // 1. Can we create this group?

  // Do the shapes have the same parent?
  if (shapesToGroup.every((shape) => shape.parentId === shapesToGroup[0].parentId)) {
    // Is the common parent a shape (not the page)?
    if (shapesToGroup[0].parentId !== pageId) {
      const commonParent = TLDR.getShape(data, shapesToGroup[0].parentId, pageId)
      // Are all of the common parent's shapes selected?
      if (commonParent.children?.length === idsToGroup.length) {
        // Don't create a group if that group would be the same as the
        // existing group.
        return
      }
    }
  }

  // A flattened array of shapes from the page
  const flattenedShapes = TLDR.flattenPage(data, pageId)

  // A map of shapes to their index in flattendShapes
  const shapeIndexMap = Object.fromEntries(
    shapesToGroup.map((shape) => [shape.id, flattenedShapes.indexOf(shape)])
  )

  // An array of shapes in order by their index in flattendShapes
  const sortedShapes = shapesToGroup.sort((a, b) => shapeIndexMap[a.id] - shapeIndexMap[b.id])

  // The parentId is always the current page
  const groupParentId = pageId // sortedShapes[0].parentId

  // The childIndex should be the lowest index of the selected shapes
  // with a parent that is the current page; or else the child index
  // of the lowest selected shape.
  const groupChildIndex = (
    sortedShapes.filter((shape) => shape.parentId === pageId)[0] || sortedShapes[0]
  ).childIndex

  // The shape's point is the min point of its childrens' common bounds
  const groupBounds = Utils.getCommonBounds(shapesToGroup.map((shape) => TLDR.getBounds(shape)))

  // Create the group
  beforeShapes[groupId] = undefined

  afterShapes[groupId] = TLDR.getShapeUtils(TLDrawShapeType.Group).create({
    id: groupId,
    childIndex: groupChildIndex,
    parentId: groupParentId,
    point: [groupBounds.minX, groupBounds.minY],
    size: [groupBounds.width, groupBounds.height],
    children: sortedShapes.map((shape) => shape.id),
  })

  // Reparent shapes to the new group
  sortedShapes.forEach((shape, index) => {
    // If the shape is part of a different group, mark the parent shape for cleanup
    if (shape.parentId !== pageId) {
      const parentShape = TLDR.getShape(data, shape.parentId, pageId)
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

  // Clean up effected parents
  while (otherEffectedGroups.length > 0) {
    const shape = otherEffectedGroups.pop()
    if (!shape) break

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const nextChildren = (beforeShapes[shape.id]?.children || shape.children)!.filter(
      (childId) => childId && !(idsToGroup.includes(childId) || deletedGroupIds.includes(childId))
    )

    // If the parent has no children, remove it
    if (nextChildren.length === 0) {
      beforeShapes[shape.id] = shape
      afterShapes[shape.id] = undefined

      // And if that parent is part of a different group, mark it for cleanup
      // (This is necessary only when we implement nested groups.)
      if (shape.parentId !== pageId) {
        deletedGroupIds.push(shape.id)
        otherEffectedGroups.push(TLDR.getShape(data, shape.parentId, pageId))
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

  // TODO: This code is copied from delete.command. Create a shared helper!

  const page = TLDR.getPage(data, pageId)

  // We also need to delete bindings that reference the deleted shapes
  Object.values(page.bindings).forEach((binding) => {
    for (const id of [binding.toId, binding.fromId]) {
      // If the binding references a deleted shape...
      if (afterShapes[id] === undefined) {
        // Delete this binding
        beforeBindings[binding.id] = binding
        afterBindings[binding.id] = undefined

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
    id: 'group',
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
            selectedIds: ids,
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
            selectedIds: [groupId],
          },
        },
      },
    },
  }
}
