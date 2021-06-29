import Command from './command'
import history from '../history'
import { Data } from 'types'
import tld from 'utils/tld'

export default function resetBoundsCommand(data: Data): void {
  const initialShapes = tld.getSelectedShapeSnapshot(data)

  history.execute(
    data,
    new Command({
      name: 'reset_bounds',
      category: 'canvas',
      do(data) {
        tld.mutateShapes(
          data,
          initialShapes.map((shape) => shape.id),
          (shape, utils) => void utils.onBoundsReset(shape)
        )
      },
      undo(data) {
        tld.mutateShapes(
          data,
          initialShapes.map((shape) => shape.id),
          (_, __, i) => initialShapes[i]
        )
      },
    })
  )
}
