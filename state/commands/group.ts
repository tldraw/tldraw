import Command from './command'
import history from '../history'
import { Data, GroupShape, Shape, ShapeType } from 'types'
import {
  getCommonBounds,
  getPage,
  getSelectedIds,
  getSelectedShapes,
  getShape,
  setSelectedIds,
} from 'utils/utils'
import { current } from 'immer'
import { createShape, getShapeUtils } from 'lib/shape-utils'
import { PropsOfType } from 'types'
import { uniqueId } from 'utils/utils'
import commands from '.'

export default function groupCommand(data: Data) {
  const cData = current(data)
  const { currentPageId } = cData

  const oldSelectedIds = getSelectedIds(cData)

  const initialShapes = getSelectedShapes(cData).sort(
    (a, b) => a.childIndex - b.childIndex
  )

  const isAllSameParent = initialShapes.every(
    (shape, i) => i === 0 || shape.parentId === initialShapes[i - 1].parentId
  )

  let newGroupParentId: string
  let newGroupShape: GroupShape
  let newGroupChildIndex: number

  const initialShapeIds = initialShapes.map((s) => s.id)

  const parentIds = Array.from(
    new Set(initialShapes.map((s) => s.parentId)).values()
  )

  const commonBounds = getCommonBounds(
    ...initialShapes.map((shape) =>
      getShapeUtils(shape).getRotatedBounds(shape)
    )
  )

  if (isAllSameParent) {
    const parentId = initialShapes[0].parentId
    if (parentId === currentPageId) {
      newGroupParentId = currentPageId
    } else {
      // Are all of the parent's children selected?
      const parent = getShape(data, parentId) as GroupShape

      if (parent.children.length === initialShapes.length) {
        // !!! Hey! We're not going any further. We need to ungroup those shapes.
        commands.ungroup(data)
        return
      } else {
        // Make the group inside of the current group
        newGroupParentId = parentId
      }
    }
  } else {
    // Find the least-deep parent among the shapes and add the group as a child
    let minDepth = Infinity

    for (let parentId of initialShapes.map((shape) => shape.parentId)) {
      const depth = getShapeDepth(data, parentId)
      if (depth < minDepth) {
        minDepth = depth
        newGroupParentId = parentId
      }
    }
  }

  newGroupShape = createShape(ShapeType.Group, {
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
        const { shapes } = getPage(data, currentPageId)

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

        setSelectedIds(data, [newGroupShape.id])
      },
      undo(data) {
        const { shapes } = getPage(data, currentPageId)

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
        setSelectedIds(data, initialShapeIds)
      },
    })
  )
}

function getShapeDepth(data: Data, id: string, depth = 0) {
  if (id === data.currentPageId) {
    return depth
  }

  return getShapeDepth(data, getShape(data, id).parentId, depth + 1)
}
