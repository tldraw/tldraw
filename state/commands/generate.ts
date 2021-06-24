import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import { deepClone, getPage, getShapes, setSelectedIds } from 'utils'

export default function generateCommand(
  data: Data,
  generatedShapes: Shape[]
): void {
  const initialShapes = getShapes(data)
    .filter((shape) => shape.isGenerated)
    .map(deepClone)

  history.execute(
    data,
    new Command({
      name: 'generate_shapes',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data)
        initialShapes.forEach((shape) => delete shapes[shape.id])
        generatedShapes.forEach((shape) => (shapes[shape.id] = shape))
        setSelectedIds(data, [])
      },
      undo(data) {
        const { shapes } = getPage(data)
        generatedShapes.forEach((shape) => delete shapes[shape.id])
        initialShapes.forEach((shape) => (shapes[shape.id] = shape))
        setSelectedIds(data, [])
      },
    })
  )
}
