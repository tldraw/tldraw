import Command from './command'
import history from '../history'
import { Data, ShapeType } from 'types'
import { getShapeUtils } from 'state/shape-utils'
import tld from 'utils/tld'
import { deepClone } from 'utils'

export default function ungroupCommand(data: Data): void {
  const { currentPageId } = data

  const selectedGroups = tld
    .getSelectedShapes(data)
    .filter((shape) => shape.type === ShapeType.Group)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => deepClone(shape))

  // Are all of the shapes already in the same group?
  // - ungroup the shapes
  // Otherwise...
  // - remove the shapes from any existing group and add them to a new one

  history.execute(
    data,
    new Command({
      name: 'ungroup_shapes',
      category: 'canvas',
      do(data) {
        const { shapes } = tld.getPage(data)

        // Remove shapes from old parents
        for (const oldGroupShape of selectedGroups) {
          const siblings = (
            oldGroupShape.parentId === currentPageId
              ? Object.values(shapes).filter(
                  (shape) => shape.parentId === currentPageId
                )
              : shapes[oldGroupShape.parentId].children.map((id) => shapes[id])
          ).sort((a, b) => a.childIndex - b.childIndex)

          const trueIndex = siblings.findIndex((s) => s.id === oldGroupShape.id)

          let step: number

          if (trueIndex === siblings.length - 1) {
            step = 1
          } else {
            step =
              (siblings[trueIndex + 1].childIndex - oldGroupShape.childIndex) /
              (oldGroupShape.children.length + 1)
          }

          // Move shapes to page
          oldGroupShape.children
            .map((id) => shapes[id])
            .forEach(({ id }, i) => {
              const shape = shapes[id]
              getShapeUtils(shape)
                .setProperty(shape, 'parentId', oldGroupShape.parentId)
                .setProperty(
                  shape,
                  'childIndex',
                  oldGroupShape.childIndex + step * i
                )
            })

          tld.setSelectedIds(data, oldGroupShape.children)

          delete shapes[oldGroupShape.id]
        }
      },
      undo(data) {
        const { shapes } = tld.getPage(data)

        selectedGroups.forEach((group) => {
          shapes[group.id] = group
          group.children.forEach((id, i) => {
            const shape = shapes[id]
            getShapeUtils(shape)
              .setProperty(shape, 'parentId', group.id)
              .setProperty(shape, 'childIndex', i)
          })
        })

        tld.setSelectedIds(
          data,
          selectedGroups.map((g) => g.id)
        )
      },
    })
  )
}

// function getShapeDepth(data: Data, id: string, depth = 0) {
//   if (id === data.currentPageId) {
//     return depth
//   }

//   return getShapeDepth(data, tld.getShape(data, id).parentId, depth + 1)
// }
