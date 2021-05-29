import Command from './command'
import history from '../history'
import { Data, DrawShape } from 'types'
import { getPage } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import { current } from 'immer'

export default function drawCommand(data: Data, id: string, after: number[][]) {
  const restoreShape = current(getPage(data)).shapes[id] as DrawShape

  getShapeUtils(restoreShape).setProperty!(restoreShape, 'points', after)

  history.execute(
    data,
    new Command({
      name: 'set_points',
      category: 'canvas',
      manualSelection: true,
      do(data, initial) {
        if (!initial) {
          getPage(data).shapes[id] = restoreShape
        }

        data.selectedIds.clear()
      },
      undo(data) {
        delete getPage(data).shapes[id]
        data.selectedIds.clear()
      },
    })
  )
}
