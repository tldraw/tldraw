import Command from './command'
import history from '../history'
import { Data, GroupShape, Shape, ShapeType } from 'types'
import {
  getCommonBounds,
  getPage,
  getSelectedShapes,
  getShape,
} from 'utils/utils'
import { current } from 'immer'
import { createShape, getShapeUtils } from 'lib/shape-utils'
import { PropsOfType } from 'types'
import { v4 as uuid } from 'uuid'
import commands from '.'

export default function groupCommand(data: Data) {
  const cData = current(data)
  const { currentPageId, selectedIds } = cData

  const initialShapes = getSelectedShapes(cData).sort(
    (a, b) => a.childIndex - b.childIndex
  )

  const isAllSameParent = initialShapes.every(
    (shape, i) => i === 0 || shape.parentId === initialShapes[i - 1].parentId
  )

  let newGroupParentId: string
  let newGroupShape: GroupShape
  let oldGroupShape: GroupShape

  const selectedShapeIds = initialShapes.map((s) => s.id)

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
        // !
        // !
        // !
        // Hey! We're not going any further. We need to ungroup those shapes.
        commands.ungroup(data)
        return
      } else {
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
    children: selectedShapeIds,
  })

  history.execute(
    data,
    new Command({
      name: 'group_shapes',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data, currentPageId)

        // Remove shapes from old parents
        for (const parentId of parentIds) {
          if (parentId === currentPageId) continue

          const shape = shapes[parentId] as GroupShape
          getShapeUtils(shape).setProperty(
            shape,
            'children',
            shape.children.filter((id) => !selectedIds.has(id))
          )
        }

        shapes[newGroupShape.id] = newGroupShape
        data.selectedIds.clear()
        data.selectedIds.add(newGroupShape.id)
        initialShapes.forEach(({ id }, i) => {
          const shape = shapes[id]
          getShapeUtils(shape)
            .setProperty(shape, 'parentId', newGroupShape.id)
            .setProperty(shape, 'childIndex', i)
        })
      },
      undo(data) {
        const { shapes } = getPage(data, currentPageId)
        data.selectedIds.clear()

        delete shapes[newGroupShape.id]
        initialShapes.forEach(({ id, parentId, childIndex }, i) => {
          data.selectedIds.add(id)
          const shape = shapes[id]
          getShapeUtils(shape)
            .setProperty(shape, 'parentId', parentId)
            .setProperty(shape, 'childIndex', childIndex)
        })
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
