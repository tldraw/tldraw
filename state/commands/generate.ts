import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import { current } from 'immer'
import { getPage, setSelectedIds } from 'utils/utils'

export default function generateCommand(
  data: Data,
  currentPageId: string,
  generatedShapes: Shape[]
): void {
  const cData = current(data)
  const page = getPage(cData)

  const currentShapes = page.shapes

  const prevGeneratedShapes = Object.values(currentShapes).filter(
    (shape) => shape.isGenerated
  )

  // Remove previous generated shapes
  for (const id in currentShapes) {
    if (currentShapes[id].isGenerated) {
      delete currentShapes[id]
    }
  }

  // Add new ones
  for (const shape of generatedShapes) {
    currentShapes[shape.id] = shape
  }

  history.execute(
    data,
    new Command({
      name: 'generate_shapes',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data)

        setSelectedIds(data, [])

        // Remove previous generated shapes
        for (const id in shapes) {
          if (shapes[id].isGenerated) {
            delete shapes[id]
          }
        }

        // Add new generated shapes
        for (const shape of generatedShapes) {
          shapes[shape.id] = shape
        }
      },
      undo(data) {
        const { shapes } = getPage(data)

        // Remove generated shapes
        for (const id in shapes) {
          if (shapes[id].isGenerated) {
            delete shapes[id]
          }
        }

        // Restore previous generated shapes
        for (const shape of prevGeneratedShapes) {
          shapes[shape.id] = shape
        }
      },
    })
  )
}
