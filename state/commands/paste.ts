import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import { getCommonBounds, setToArray } from 'utils'
import tld from 'utils/tld'
import { uniqueId } from 'utils/utils'
import vec from 'utils/vec'
import { getShapeUtils } from 'state/shape-utils'
import state from 'state/state'

export default function pasteCommand(data: Data, initialShapes: Shape[]): void {
  const center = tld.screenToWorld(
    [window.innerWidth / 2, window.innerHeight / 2],
    data
  )

  const bounds = getCommonBounds(
    ...initialShapes.map((shape) =>
      getShapeUtils(shape).getRotatedBounds(shape)
    )
  )

  const topLeft = vec.sub(center, [bounds.width / 2, bounds.height / 2])

  const newIdMap = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, uniqueId()])
  )

  const oldSelectedIds = setToArray(tld.getSelectedIds(data))

  history.execute(
    data,
    new Command({
      name: 'paste_new_shapes',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { shapes } = tld.getPage(data)

        let childIndex =
          (state.values.currentShapes[state.values.currentShapes.length - 1]
            ?.childIndex || 0) + 1

        for (const shape of initialShapes) {
          const topLeftOffset = vec.sub(shape.point, [bounds.minX, bounds.minY])

          const newId = newIdMap[shape.id]

          shapes[newId] = {
            ...shape,
            id: newId,
            parentId: oldSelectedIds[shape.parentId] || data.currentPageId,
            childIndex: childIndex++,
            point: vec.add(topLeft, topLeftOffset),
            isGenerated: false,
          }
        }

        tld.setSelectedIds(data, Object.values(newIdMap))
      },
      undo(data) {
        const { shapes } = tld.getPage(data)

        Object.values(newIdMap).forEach((id) => delete shapes[id])

        tld.setSelectedIds(data, oldSelectedIds)
      },
    })
  )
}
