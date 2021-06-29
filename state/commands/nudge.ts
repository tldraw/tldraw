import Command from './command'
import history from '../history'
import { Data } from 'types'
import tld from 'utils/tld'
import vec from 'utils/vec'

export default function nudgeCommand(data: Data, delta: number[]): void {
  const initialShapes = tld.getSelectedShapeSnapshot(data, () => null)

  history.execute(
    data,
    new Command({
      name: 'nudge_shapes',
      category: 'canvas',
      do(data) {
        tld.mutateShapes(
          data,
          initialShapes.map((shape) => shape.id),
          (shape, utils) => {
            utils.setProperty(shape, 'point', vec.add(shape.point, delta))
          }
        )
      },
      undo(data) {
        tld.mutateShapes(
          data,
          initialShapes.map((shape) => shape.id),
          (shape, utils) => {
            utils.setProperty(shape, 'point', vec.sub(shape.point, delta))
          }
        )
      },
    })
  )
}
