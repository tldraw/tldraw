import Command from './command'
import history from '../history'
import { Data, DrawShape } from 'types'
import { getPage, setSelectedIds } from 'utils/utils'
import { current } from 'immer'

export default function drawCommand(data: Data, id: string): void {
  const restoreShape = getPage(current(data)).shapes[id] as DrawShape

  history.execute(
    data,
    new Command({
      name: 'create_draw_shape',
      category: 'canvas',
      manualSelection: true,
      do(data, initial) {
        if (!initial) {
          getPage(data).shapes[id] = restoreShape
        }

        setSelectedIds(data, [])
      },
      undo(data) {
        setSelectedIds(data, [])
        delete getPage(data).shapes[id]
      },
    })
  )
}
