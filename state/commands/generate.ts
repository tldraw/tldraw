import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import { deepClone } from 'utils'
import tld from 'utils/tld'
import storage from 'state/storage'

export default function generateCommand(
  data: Data,
  generatedShapes: Shape[]
): void {
  const initialShapes = tld
    .getShapes(data)
    .filter((shape) => shape.isGenerated)
    .map(deepClone)

  history.execute(
    data,
    new Command({
      name: 'generate_shapes',
      category: 'canvas',
      do(data) {
        const { shapes } = tld.getPage(data)
        initialShapes.forEach((shape) => delete shapes[shape.id])
        generatedShapes.forEach((shape) => (shapes[shape.id] = shape))
        tld.setSelectedIds(data, [])

        storage.savePage(data)
      },
      undo(data) {
        const { shapes } = tld.getPage(data)
        generatedShapes.forEach((shape) => delete shapes[shape.id])
        initialShapes.forEach((shape) => (shapes[shape.id] = shape))
        tld.setSelectedIds(data, [])

        storage.savePage(data)
      },
    })
  )
}
