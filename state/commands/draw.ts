import Command from './command'
import history from '../history'
import { Data, DrawShape } from 'types'
import tld from 'utils/tld'
import { deepClone } from 'utils'

export default function drawCommand(data: Data, id: string): void {
  const restoreShape = deepClone(tld.getShape(data, id)) as DrawShape

  history.execute(
    data,
    new Command({
      name: 'create_draw_shape',
      category: 'canvas',
      manualSelection: true,
      do(data, initial) {
        if (!initial) {
          tld.getPage(data).shapes[id] = restoreShape
        }

        tld.setSelectedIds(data, [])
      },
      undo(data) {
        tld.setSelectedIds(data, [])
        delete tld.getPage(data).shapes[id]
      },
    })
  )
}
