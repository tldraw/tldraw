import Command from './command'
import history from '../history'
import { Data, PointerInfo } from 'types'
import { getShapeUtils } from 'state/shape-utils'
import { deepClone } from 'utils'
import tld from 'utils/tld'

export default function doublePointHandleCommand(
  data: Data,
  id: string,
  payload: PointerInfo
): void {
  const initialShape = deepClone(tld.getShape(data, id))

  history.execute(
    data,
    new Command({
      name: 'double_point_handle',
      category: 'canvas',
      do(data) {
        const { shapes } = tld.getPage(data)

        const shape = shapes[id]
        getShapeUtils(shape).onDoublePointHandle(shape, payload.target, payload)
        tld.updateParents(data, [id])
      },
      undo(data) {
        const { shapes } = tld.getPage(data)
        shapes[id] = initialShape
        tld.updateParents(data, [id])
      },
    })
  )
}
