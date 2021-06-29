import Command from './command'
import history from '../history'
import { Data, GroupShape, ShapeType } from 'types'
import { deepClone, getCommonBounds } from 'utils'
import tld from 'utils/tld'
import { createShape, getShapeUtils } from 'state/shape-utils'
import commands from '.'

export default function groupCommand(data: Data): void {
  const { currentPageId } = data

  const oldSelectedIds = tld.getSelectedIds(data)

  const initialShapes = tld
    .getSelectedShapes(data)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => deepClone(shape))

  const isAllSameParent = initialShapes.every(
    (shape, i) => i === 0 || shape.parentId === initialShapes[i - 1].parentId
  )

  // Do we need to ungroup the selected shapes shapes, rather than group them?
  if (isAllSameParent && initialShapes[0]?.parentId !== currentPageId) {
    const parent = tld.getShape(data, initialShapes[0]?.parentId) as GroupShape
    if (parent.children.length === initialShapes.length) {
      commands.ungroup(data)
      return
    }
  }

  let newGroupParentId: string

  const initialShapeIds = initialShapes.map((s) => s.id)

  const commonBounds = getCommonBounds(
    ...initialShapes.map((shape) =>
      getShapeUtils(shape).getRotatedBounds(shape)
    )
  )

  if (isAllSameParent) {
    const parentId = initialShapes[0].parentId
    if (parentId === currentPageId) {
      // Create the new group on the current page
      newGroupParentId = currentPageId
    } else {
      // Create the new group as a child of the shapes' current parent group
      newGroupParentId = parentId
    }
  } else {
    // Find the least-deep parent among the shapes and add the group as a child
    let minDepth = Infinity

    for (const parentId of initialShapes.map((shape) => shape.parentId)) {
      const depth = getShapeDepth(data, parentId)
      if (depth < minDepth) {
        minDepth = depth
        newGroupParentId = parentId
      }
    }
  }

  const newGroupShape = createShape(ShapeType.Group, {
    parentId: newGroupParentId,
    point: [commonBounds.minX, commonBounds.minY],
    size: [commonBounds.width, commonBounds.height],
    children: initialShapeIds,
    childIndex: initialShapes[0].childIndex,
  })

  history.execute(
    data,
    new Command({
      name: 'group_shapes',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { shapes } = tld.getPage(data)

        // Create the new group
        shapes[newGroupShape.id] = newGroupShape

        // Assign the group to its new parent
        if (newGroupParentId !== data.currentPageId) {
          const parent = shapes[newGroupParentId]
          getShapeUtils(parent).setProperty(parent, 'children', [
            ...parent.children,
            newGroupShape.id,
          ])
        }

        // Assign the shapes to their new parent
        initialShapes.forEach((initialShape, i) => {
          // Remove shape from its old parent
          if (initialShape.parentId !== currentPageId) {
            const oldParent = shapes[initialShape.parentId] as GroupShape
            getShapeUtils(oldParent).setProperty(
              oldParent,
              'children',
              oldParent.children.filter((id) => !oldSelectedIds.has(id))
            )
          }

          // Assign the shape to its new parent, with its new childIndex
          const shape = shapes[initialShape.id]
          getShapeUtils(shape)
            .setProperty(shape, 'childIndex', i)
            .setProperty(shape, 'parentId', newGroupShape.id)
        })

        tld.setSelectedIds(data, [newGroupShape.id])
      },
      undo(data) {
        const { shapes } = tld.getPage(data)

        const group = shapes[newGroupShape.id]

        // remove the group from its parent
        if (group.parentId !== data.currentPageId) {
          const parent = shapes[group.parentId]
          getShapeUtils(parent).setProperty(
            parent,
            'children',
            parent.children.filter((id) => id !== newGroupShape.id)
          )
        }

        // Move the shapes back to their previous parent / childIndex
        initialShapes.forEach(({ id, parentId, childIndex }) => {
          const shape = shapes[id]
          getShapeUtils(shape)
            .setProperty(shape, 'parentId', parentId)
            .setProperty(shape, 'childIndex', childIndex)

          if (parentId !== data.currentPageId) {
            const parent = shapes[parentId]
            getShapeUtils(parent).setProperty(parent, 'children', [
              ...parent.children,
              id,
            ])
          }
        })

        // Delete the group
        delete shapes[newGroupShape.id]

        // Reselect the children of the group
        tld.setSelectedIds(data, initialShapeIds)
      },
    })
  )
}

function getShapeDepth(data: Data, id: string, depth = 0) {
  if (id === data.currentPageId) {
    return depth
  }

  return getShapeDepth(data, tld.getShape(data, id).parentId, depth + 1)
}
