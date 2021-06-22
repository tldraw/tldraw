import Command from './command'
import history from '../history'
import { Data, PointerInfo } from 'types'
import { getShapeUtils } from 'state/shape-utils'
import { deepClone, getPage, getShape, updateParents } from 'utils/utils'

export default function doublePointHandleCommand(
  data: Data,
  id: string,
  payload: PointerInfo
): void {
  const initialShape = deepClone(getShape(data, id))

  history.execute(
    data,
    new Command({
      name: 'double_point_handle',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data)

        const shape = shapes[id]
        getShapeUtils(shape).onDoublePointHandle(shape, payload.target, payload)
        updateParents(data, [id])
      },
      undo(data) {
        const { shapes } = getPage(data)
        shapes[id] = initialShape
        updateParents(data, [id])
      },
    })
  )
}
